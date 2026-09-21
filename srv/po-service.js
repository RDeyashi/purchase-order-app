const cds = require("@sap/cds");
const LOG = cds.log("po-service");

module.exports = cds.service.impl(async function () {
    const { PurchaseOrders, POItems, POStatusHistory, Vendors } = this.entities;

    
    // DB CONNECTION — Connect once, reuse
    const db = await cds.connect.to("db");

    
    // CACHE — Reference data (Vendors/Products)
    let _vendorCache = null;
    let _vendorCacheTime = null;
    const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

    async function getVendorMap() {
        const now = Date.now();
        if (_vendorCache && _vendorCacheTime && (now - _vendorCacheTime < CACHE_TTL)) {
            return _vendorCache;
        }
        const vendors = await db.run(
            SELECT.from(Vendors)
                .columns("ID", "name")
                .where({ isActive: true })
        );
        _vendorCache = {};
        vendors.forEach(v => { _vendorCache[v.ID] = v.name; });
        _vendorCacheTime = now;
        LOG.info("Vendor cache refreshed", { count: vendors.length });
        return _vendorCache;
    }

    // Invalidate cache when vendors change
    this.after(["CREATE", "UPDATE", "DELETE"], Vendors, () => {
        _vendorCache = null;
        _vendorCacheTime = null;
        LOG.info("Vendor cache invalidated");
    });

    
    // HELPER — Generate PO Number
    // Format: PO-2026-0001
    async function generatePONumber() {
        const year = new Date().getFullYear();
        const prefix = `PO-${year}-`;

        // Select only poNumber — minimal data fetch
        const last = await db.run(
            SELECT.one(PurchaseOrders)
                .columns("poNumber")
                .where({ poNumber: { like: `${prefix}%` } })
                .orderBy({ poNumber: "desc" })
        );

        const nextSeq = last?.poNumber
            ? parseInt(last.poNumber.split("-")[2], 10) + 1
            : 1;

        return `${prefix}${String(nextSeq).padStart(4, "0")}`;
    }

    
    // HELPER — Calculate Single Item Total
    function calculateItemTotal(item) {
        const qty = parseFloat(item.quantity) || 0;
        const unitPrice = parseFloat(item.unitPrice) || 0;
        const discountPct = parseFloat(item.discount) || 0;
        const taxRate = parseFloat(item.taxRate) || 18;

        const gross = qty * unitPrice;
        const discountAmt = (gross * discountPct) / 100;
        const taxableAmt = gross - discountAmt;
        const taxAmt = (taxableAmt * taxRate) / 100;

        return parseFloat((taxableAmt + taxAmt).toFixed(2));
    }

    
    // HELPER — Calculate PO Level Totals
    function calculatePOTotals(items = []) {
        let totalAmount = 0;
        let totalDiscount = 0;
        let totalTax = 0;

        for (const item of items) {
            const qty = parseFloat(item.quantity) || 0;
            const unitPrice = parseFloat(item.unitPrice) || 0;
            const discountPct = parseFloat(item.discount) || 0;
            const taxRate = parseFloat(item.taxRate) || 18;

            const gross = qty * unitPrice;
            const discountAmt = (gross * discountPct) / 100;
            const taxableAmt = gross - discountAmt;
            const taxAmt = (taxableAmt * taxRate) / 100;

            totalAmount += gross;
            totalDiscount += discountAmt;
            totalTax += taxAmt;
        }

        const netAmount = totalAmount - totalDiscount + totalTax;

        return {
            totalAmount: parseFloat(totalAmount.toFixed(2)),
            discountAmount: parseFloat(totalDiscount.toFixed(2)),
            taxAmount: parseFloat(totalTax.toFixed(2)),
            netAmount: parseFloat(netAmount.toFixed(2))
        };
    }

    
    // HELPER — Log Status History
    async function logStatusHistory(poId, fromStatus, toStatus, remarks, req) {
        await db.run(
            INSERT.into(POStatusHistory).entries({
                po_ID: poId,
                fromStatus: fromStatus,
                toStatus: toStatus,
                changedBy: req.user?.id || "system",
                changedAt: new Date().toISOString(),
                remarks: remarks || `Status changed from ${fromStatus} to ${toStatus}`
            })
        );
    }

    
    // HELPER — Fetch PO with minimal columns
    async function fetchPO(poId, columns = ["ID", "status", "vendor_ID", "deliveryDate"]) {
        return db.run(
            SELECT.one(PurchaseOrders)
                .columns(...columns)
                .where({ ID: poId })
        );
    }

    
    // HELPER — Validate PO transition
    function validateTransition(po, poId, expectedStatus, req) {
        if (!po)
            return req.error(404, `Purchase Order ${poId} not found`);
        if (po.status !== expectedStatus)
            return req.error(400,
                `Expected status '${expectedStatus}' but current is '${po.status}'`);
    }

    
    // AFTER READ — Compute statusCriticality
    this.after("READ", PurchaseOrders, (results) => {
        const pos = Array.isArray(results) ? results : [results];
        const statusMap = {
            Approved: 3,
            Submitted: 2,
            UnderReview: 2,
            Rejected: 1,
            Cancelled: 1
        };
        for (const po of pos) {
            if (po) po.statusCriticality = statusMap[po.status] ?? 0;
        }
    });

    
    // BEFORE CREATE — PurchaseOrders
    this.before("CREATE", PurchaseOrders, async (req) => {
        // auto generate PO number
        req.data.poNumber = await generatePONumber();
        req.data.status = "Draft";
        req.data.priority = req.data.priority || "Medium";
        req.data.orderDate = req.data.orderDate
            || new Date().toISOString().split("T")[0];

        if (req.data.items?.length > 0) {
            req.data.items = req.data.items.map((item, idx) => ({
                ...item,
                itemNumber: (idx + 1) * 10,
                totalPrice: calculateItemTotal(item),
                uom: item.uom || "PCS"
            }));
            Object.assign(req.data, calculatePOTotals(req.data.items));
        }

        LOG.info("Creating PO", { poNumber: req.data.poNumber, user: req.user?.id });
    });

    
    // AFTER CREATE — Log Draft history
    this.after("CREATE", PurchaseOrders, async (result, req) => {
        await logStatusHistory(result.ID, null, "Draft", "Purchase Order created", req);
        LOG.info("PO created", { ID: result.ID, poNumber: result.poNumber });
    });

    
    // BEFORE UPDATE — PurchaseOrders
    this.before("UPDATE", PurchaseOrders, async (req) => {
        // fetch only needed columns — minimal data
        const existing = await fetchPO(req.data.ID, ["ID", "status"]);

        if (!existing)
            return req.error(404, "Purchase Order not found");

        if (["Approved", "Cancelled"].includes(existing.status))
            return req.error(400,
                `Cannot edit PO in '${existing.status}' status`);

        if (req.data.items?.length > 0) {
            req.data.items = req.data.items.map((item, idx) => ({
                ...item,
                itemNumber: item.itemNumber || (idx + 1) * 10,
                totalPrice: calculateItemTotal(item)
            }));
            Object.assign(req.data, calculatePOTotals(req.data.items));
        }
    });

    
    // BEFORE CREATE — POItems
    this.before("CREATE", POItems, (req) => {
        req.data.totalPrice = calculateItemTotal(req.data);
        req.data.uom = req.data.uom || "PCS";
    });

    
    // AFTER CREATE/UPDATE/DELETE — POItems
    // Recalculate PO totals in one transaction
    async function recalcPOTotals(poId) {
        if (!poId) return;
        const allItems = await db.run(
            SELECT.from(POItems)
                .columns("quantity", "unitPrice", "discount", "taxRate")
                .where({ po_ID: poId })
        );
        const totals = calculatePOTotals(allItems);
        await db.run(
            UPDATE(PurchaseOrders).set(totals).where({ ID: poId })
        );
    }

    this.after("CREATE", POItems, async (result) => {
        await recalcPOTotals(result.po_ID);
    });

    this.after("UPDATE", POItems, async (result) => {
        await recalcPOTotals(result.po_ID);
    });

    this.after("DELETE", POItems, async (result, req) => {
        const poId = req.params?.[0]?.po_ID || result?.po_ID;
        await recalcPOTotals(poId);
    });

    
    // ACTION — submitPO  Draft → Submitted
    this.on("submitPO", async (req) => {
        const { poId, remarks } = req.data;
        if (!poId) return req.error(400, "poId is required");

        // fetch only needed columns
        const po = await fetchPO(poId, ["ID", "status", "vendor_ID", "deliveryDate"]);
        const err = validateTransition(po, poId, "Draft", req);
        if (err) return err;

        // validate before write
        if (!po.vendor_ID) return req.error(400, "PO has no Vendor assigned");
        if (!po.deliveryDate) return req.error(400, "PO has no Delivery Date");

        const itemCount = await db.run(
            SELECT.one(POItems)
                .columns("count(*) as cnt")
                .where({ po_ID: poId })
        );
        if (!itemCount?.cnt || itemCount.cnt === 0)
            return req.error(400, "PO has no line items");

        // single write + history in sequence
        await db.run(
            UPDATE(PurchaseOrders)
                .set({ status: "Submitted", submittedAt: new Date().toISOString() })
                .where({ ID: poId })
        );
        await logStatusHistory(poId, "Draft", "Submitted", remarks, req);

        LOG.info("PO submitted", { poId, user: req.user?.id });
        return fetchPO(poId, ["ID", "poNumber", "status", "submittedAt"]);
    });

    
    // ACTION — reviewPO  Submitted → UnderReview
    this.on("reviewPO", async (req) => {
        const { poId, remarks } = req.data;
        if (!poId) return req.error(400, "poId is required");

        const po = await fetchPO(poId, ["ID", "status"]);
        const err = validateTransition(po, poId, "Submitted", req);
        if (err) return err;

        await db.run(
            UPDATE(PurchaseOrders)
                .set({ status: "UnderReview", reviewedAt: new Date().toISOString() })
                .where({ ID: poId })
        );
        await logStatusHistory(poId, "Submitted", "UnderReview", remarks, req);

        LOG.info("PO under review", { poId, user: req.user?.id });
        return fetchPO(poId, ["ID", "poNumber", "status", "reviewedAt"]);
    });

    
    // ACTION — approvePO  UnderReview → Approved
    this.on("approvePO", async (req) => {
        const { poId, remarks } = req.data;
        if (!poId) return req.error(400, "poId is required");

        const po = await fetchPO(poId, ["ID", "status"]);
        const err = validateTransition(po, poId, "UnderReview", req);
        if (err) return err;

        await db.run(
            UPDATE(PurchaseOrders)
                .set({
                    status: "Approved",
                    approvedAt: new Date().toISOString(),
                    approvedBy: req.user?.id || "approver"
                })
                .where({ ID: poId })
        );
        await logStatusHistory(poId, "UnderReview", "Approved", remarks, req);

        LOG.info("PO approved", { poId, user: req.user?.id });
        return fetchPO(poId, ["ID", "poNumber", "status", "approvedAt", "approvedBy"]);
    });

    
    // ACTION — rejectPO  UnderReview → Rejected
    this.on("rejectPO", async (req) => {
        const { poId, rejectionReason, remarks } = req.data;
        if (!poId) return req.error(400, "poId is required");
        if (!rejectionReason) return req.error(400, "Rejection reason is mandatory");

        const po = await fetchPO(poId, ["ID", "status"]);
        const err = validateTransition(po, poId, "UnderReview", req);
        if (err) return err;

        await db.run(
            UPDATE(PurchaseOrders)
                .set({ status: "Rejected", rejectionReason })
                .where({ ID: poId })
        );
        await logStatusHistory(poId, "UnderReview", "Rejected", rejectionReason, req);

        LOG.info("PO rejected", { poId, user: req.user?.id, reason: rejectionReason });
        return fetchPO(poId, ["ID", "poNumber", "status", "rejectionReason"]);
    });

    
    // ACTION — cancelPO  Any → Cancelled
    this.on("cancelPO", async (req) => {
        const { poId, remarks } = req.data;
        if (!poId) return req.error(400, "poId is required");

        const po = await fetchPO(poId, ["ID", "status"]);
        if (!po) return req.error(404, `PO ${poId} not found`);

        if (["Approved", "Cancelled"].includes(po.status))
            return req.error(400, `Cannot cancel PO in '${po.status}' status`);

        await db.run(
            UPDATE(PurchaseOrders)
                .set({ status: "Cancelled" })
                .where({ ID: poId })
        );
        await logStatusHistory(poId, po.status, "Cancelled", remarks, req);

        LOG.info("PO cancelled", { poId, user: req.user?.id });
        return fetchPO(poId, ["ID", "poNumber", "status"]);
    });

    
    // FUNCTION — getDashboardStats
    // Optimized: DB-level aggregation
    this.on("getDashboardStats", async (req) => {
        LOG.info("getDashboardStats called", { user: req.user?.id });

        // ── Parallel queries — run simultaneously ──
        const [allPOs, vendorMap] = await Promise.all([
            db.run(
                SELECT.from(PurchaseOrders)
                    .columns("status", "netAmount", "vendor_ID", "orderDate")
            ),
            getVendorMap()
        ]);

        // ── Compute stats in single pass ──
        let totalAmount = 0;
        let approvedAmount = 0;
        let pendingAmount = 0;
        let draftCount = 0;
        let submittedCount = 0;
        let underReviewCount = 0;
        let approvedCount = 0;
        let rejectedCount = 0;
        let cancelledCount = 0;

        const vendorStats = {};
        const monthlyMap = {};

        for (const po of allPOs) {
            const amt = parseFloat(po.netAmount) || 0;
            totalAmount += amt;

            // status counts + amounts in one pass
            switch (po.status) {
                case "Draft": draftCount++; break;
                case "Submitted": submittedCount++; pendingAmount += amt; break;
                case "UnderReview": underReviewCount++; pendingAmount += amt; break;
                case "Approved": approvedCount++; approvedAmount += amt; break;
                case "Rejected": rejectedCount++; break;
                case "Cancelled": cancelledCount++; break;
            }

            // vendor aggregation
            if (po.vendor_ID) {
                if (!vendorStats[po.vendor_ID]) {
                    vendorStats[po.vendor_ID] = { poCount: 0, totalAmount: 0 };
                }
                vendorStats[po.vendor_ID].poCount++;
                vendorStats[po.vendor_ID].totalAmount += amt;
            }

            // monthly trend
            if (po.orderDate) {
                const month = po.orderDate.substring(0, 7);
                if (!monthlyMap[month]) {
                    monthlyMap[month] = { month, poCount: 0, totalAmount: 0 };
                }
                monthlyMap[month].poCount++;
                monthlyMap[month].totalAmount += amt;
            }
        }

        // ── Top 5 vendors with cached names ──
        const topVendors = Object.entries(vendorStats)
            .map(([id, stats]) => ({
                vendorId: id,
                vendorName: vendorMap[id] || "Unknown",
                poCount: stats.poCount,
                totalAmount: parseFloat(stats.totalAmount.toFixed(2))
            }))
            .sort((a, b) => b.totalAmount - a.totalAmount)
            .slice(0, 5);

        // ── Last 6 months trend ──
        const monthlyTrend = Object.values(monthlyMap)
            .sort((a, b) => a.month.localeCompare(b.month))
            .slice(-6)
            .map(m => ({
                ...m,
                totalAmount: parseFloat(m.totalAmount.toFixed(2))
            }));

        return {
            totalPOs: allPOs.length,
            totalAmount: parseFloat(totalAmount.toFixed(2)),
            draftCount,
            submittedCount,
            underReviewCount,
            approvedCount,
            rejectedCount,
            cancelledCount,
            approvedAmount: parseFloat(approvedAmount.toFixed(2)),
            pendingAmount: parseFloat(pendingAmount.toFixed(2)),
            topVendors,
            monthlyTrend
        };
    });
});