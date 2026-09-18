const cds = require("@sap/cds");

module.exports = cds.service.impl(async function () {
    const { PurchaseOrders, POItems, POStatusHistory, Vendors, Products } = this.entities;


    // HELPER — Generate PO Number
    // Format: PO-2024-0001

    async function generatePONumber(db) {
        const year = new Date().getFullYear();
        const prefix = `PO-${year}-`;

        const last = await db.run(
            SELECT.one(PurchaseOrders)
                .where({ poNumber: { like: `${prefix}%` } })
                .orderBy({ poNumber: "desc" })
        );

        let nextSeq = 1;
        if (last && last.poNumber) {
            const lastSeq = parseInt(last.poNumber.split("-")[2], 10);
            nextSeq = lastSeq + 1;
        }

        return `${prefix}${String(nextSeq).padStart(4, "0")}`;
    }


    // HELPER — Calculate Single Item Total
    // total = (qty * unitPrice) - discount% + tax%

    function calculateItemTotal(item) {
        const qty = parseFloat(item.quantity) || 0;
        const unitPrice = parseFloat(item.unitPrice) || 0;
        const discountPct = parseFloat(item.discount) || 0;
        const taxRate = parseFloat(item.taxRate) || 18;

        const gross = qty * unitPrice;
        const discountAmt = (gross * discountPct) / 100;
        const taxableAmt = gross - discountAmt;
        const taxAmt = (taxableAmt * taxRate) / 100;
        const total = taxableAmt + taxAmt;

        return parseFloat(total.toFixed(2));
    }


    // HELPER — Calculate PO Level Totals
    // from all line items

    function calculatePOTotals(items = []) {
        let totalAmount = 0;
        let totalDiscount = 0;
        let totalTax = 0;

        items.forEach((item) => {
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
        });

        const netAmount = totalAmount - totalDiscount + totalTax;

        return {
            totalAmount: parseFloat(totalAmount.toFixed(2)),
            discountAmount: parseFloat(totalDiscount.toFixed(2)),
            taxAmount: parseFloat(totalTax.toFixed(2)),
            netAmount: parseFloat(netAmount.toFixed(2)),
        };
    }


    // HELPER — Log Status History

    async function logStatusHistory(db, poId, fromStatus, toStatus, remarks, req) {
        await db.run(
            INSERT.into(POStatusHistory).entries({
                po_ID: poId,
                fromStatus: fromStatus,
                toStatus: toStatus,
                changedBy: req.user?.id || "system",
                changedAt: new Date().toISOString(),
                remarks: remarks || `Status changed from ${fromStatus} to ${toStatus}`,
            })
        );
    }


    // HELPER — Validate PO for Submission

    async function validatePOForSubmit(db, poId, req) {
        const items = await db.run(
            SELECT.from(POItems).where({ po_ID: poId })
        );

        if (!items || items.length === 0)
            return req.error(400, "Cannot submit PO without line items");

        const po = await db.run(
            SELECT.one(PurchaseOrders).where({ ID: poId })
        );

        if (!po.vendor_ID)
            return req.error(400, "Cannot submit PO without a Vendor");

        if (!po.deliveryDate)
            return req.error(400, "Cannot submit PO without a Delivery Date");
    }

    // AFTER READ — PurchaseOrders

    this.after('READ', PurchaseOrders, (results) => {
        const pos = Array.isArray(results) ? results : [results];
        pos.forEach((po) => {
            if (!po) return;
            switch (po.status) {
                case 'Approved':
                    po.statusCriticality = 3; // Green
                    break;
                case 'Submitted':
                case 'UnderReview':
                    po.statusCriticality = 2; // Orange
                    break;
                case 'Rejected':
                case 'Cancelled':
                    po.statusCriticality = 1; // Red
                    break;
                default:
                    po.statusCriticality = 0; // Grey — Draft
            }
        });
    });


    // BEFORE CREATE — PurchaseOrders

    this.before("CREATE", PurchaseOrders, async (req) => {
        const db = await cds.connect.to("db");

        // auto generate PO number
        req.data.poNumber = await generatePONumber(db);

        // defaults
        req.data.status = "Draft";
        req.data.priority = req.data.priority || "Medium";
        req.data.orderDate =
            req.data.orderDate || new Date().toISOString().split("T")[0];

        // calculate items if passed with PO
        if (req.data.items && req.data.items.length > 0) {
            req.data.items = req.data.items.map((item, index) => ({
                ...item,
                itemNumber: (index + 1) * 10,
                totalPrice: calculateItemTotal(item),
                uom: item.uom || "PCS",
            }));

            const totals = calculatePOTotals(req.data.items);
            Object.assign(req.data, totals);
        }
    });


    // AFTER CREATE — PurchaseOrders
    // Log Draft status in history

    this.after("CREATE", PurchaseOrders, async (result, req) => {
        const db = await cds.connect.to("db");

        await logStatusHistory(
            db,
            result.ID,
            null,
            "Draft",
            "Purchase Order created",
            req
        );
    });


    // BEFORE UPDATE — PurchaseOrders
    // Block editing terminal status POs
    // Recalculate totals if items changed

    this.before("UPDATE", PurchaseOrders, async (req) => {
        const db = await cds.connect.to("db");

        const existing = await db.run(
            SELECT.one(PurchaseOrders).where({ ID: req.data.ID })
        );

        if (!existing)
            return req.error(404, "Purchase Order not found");

        const blockedStatuses = ["Approved", "Cancelled"];
        if (blockedStatuses.includes(existing.status))
            return req.error(
                400,
                `Cannot edit a Purchase Order in '${existing.status}' status`
            );

        if (req.data.items && req.data.items.length > 0) {
            req.data.items = req.data.items.map((item, index) => ({
                ...item,
                itemNumber: item.itemNumber || (index + 1) * 10,
                totalPrice: calculateItemTotal(item),
            }));

            const totals = calculatePOTotals(req.data.items);
            Object.assign(req.data, totals);
        }
    });


    // BEFORE CREATE — POItems
    // Calculate item total when item added standalone

    this.before("CREATE", POItems, async (req) => {
        req.data.totalPrice = calculateItemTotal(req.data);
        req.data.uom = req.data.uom || "PCS";
    });


    // AFTER CREATE — POItems
    // Recalculate PO totals after item added

    this.after("CREATE", POItems, async (result, req) => {
        const db = await cds.connect.to("db");

        const allItems = await db.run(
            SELECT.from(POItems).where({ po_ID: result.po_ID })
        );

        const totals = calculatePOTotals(allItems);

        await db.run(
            UPDATE(PurchaseOrders)
                .set(totals)
                .where({ ID: result.po_ID })
        );
    });


    // AFTER UPDATE — POItems
    // Recalculate PO totals after item updated

    this.after("UPDATE", POItems, async (result, req) => {
        const db = await cds.connect.to("db");

        const allItems = await db.run(
            SELECT.from(POItems).where({ po_ID: result.po_ID })
        );

        const totals = calculatePOTotals(allItems);

        await db.run(
            UPDATE(PurchaseOrders)
                .set(totals)
                .where({ ID: result.po_ID })
        );
    });


    // AFTER DELETE — POItems
    // Recalculate PO totals after item deleted

    this.after("DELETE", POItems, async (result, req) => {
        const db = await cds.connect.to("db");
        const poId = req.params?.[0]?.po_ID || result?.po_ID;

        if (!poId) return;

        const allItems = await db.run(
            SELECT.from(POItems).where({ po_ID: poId })
        );

        const totals = calculatePOTotals(allItems);

        await db.run(
            UPDATE(PurchaseOrders)
                .set(totals)
                .where({ ID: poId })
        );
    });


    // ACTION — submitPO
    // Draft → Submitted

    this.on("submitPO", async (req) => {
        const db = await cds.connect.to("db");
        const { poId, remarks } = req.data;

        const po = await db.run(SELECT.one(PurchaseOrders).where({ ID: poId }));
        if (!po) return req.error(404, "Purchase Order not found");
        if (po.status !== "Draft")
            return req.error(
                400,
                `Only Draft POs can be submitted. Current: ${po.status}`
            );

        await validatePOForSubmit(db, poId, req);

        await db.run(
            UPDATE(PurchaseOrders)
                .set({ status: "Submitted", submittedAt: new Date().toISOString() })
                .where({ ID: poId })
        );

        await logStatusHistory(db, poId, "Draft", "Submitted", remarks, req);

        return await db.run(SELECT.one(PurchaseOrders).where({ ID: poId }));
    });


    // ACTION — reviewPO
    // Submitted → UnderReview

    this.on("reviewPO", async (req) => {
        const db = await cds.connect.to("db");
        const { poId, remarks } = req.data;

        const po = await db.run(SELECT.one(PurchaseOrders).where({ ID: poId }));
        if (!po) return req.error(404, "Purchase Order not found");
        if (po.status !== "Submitted")
            return req.error(
                400,
                `Only Submitted POs can be reviewed. Current: ${po.status}`
            );

        await db.run(
            UPDATE(PurchaseOrders)
                .set({ status: "UnderReview", reviewedAt: new Date().toISOString() })
                .where({ ID: poId })
        );

        await logStatusHistory(db, poId, "Submitted", "UnderReview", remarks, req);

        return await db.run(SELECT.one(PurchaseOrders).where({ ID: poId }));
    });


    // ACTION — approvePO
    // UnderReview → Approved

    this.on("approvePO", async (req) => {
        const db = await cds.connect.to("db");
        const { poId, remarks } = req.data;

        const po = await db.run(SELECT.one(PurchaseOrders).where({ ID: poId }));
        if (!po) return req.error(404, "Purchase Order not found");
        if (po.status !== "UnderReview")
            return req.error(
                400,
                `Only POs Under Review can be approved. Current: ${po.status}`
            );

        await db.run(
            UPDATE(PurchaseOrders)
                .set({
                    status: "Approved",
                    approvedAt: new Date().toISOString(),
                    approvedBy: req.user?.id || "approver",
                })
                .where({ ID: poId })
        );

        await logStatusHistory(db, poId, "UnderReview", "Approved", remarks, req);

        return await db.run(SELECT.one(PurchaseOrders).where({ ID: poId }));
    });


    // ACTION — rejectPO
    // UnderReview → Rejected

    this.on("rejectPO", async (req) => {
        const db = await cds.connect.to("db");
        const { poId, rejectionReason, remarks } = req.data;

        const po = await db.run(SELECT.one(PurchaseOrders).where({ ID: poId }));
        if (!po) return req.error(404, "Purchase Order not found");
        if (po.status !== "UnderReview")
            return req.error(
                400,
                `Only POs Under Review can be rejected. Current: ${po.status}`
            );

        if (!rejectionReason)
            return req.error(400, "Rejection reason is mandatory");

        await db.run(
            UPDATE(PurchaseOrders)
                .set({ status: "Rejected", rejectionReason: rejectionReason })
                .where({ ID: poId })
        );

        await logStatusHistory(db, poId, "UnderReview", "Rejected", rejectionReason, req);

        return await db.run(SELECT.one(PurchaseOrders).where({ ID: poId }));
    });


    // ACTION — cancelPO
    // Any non-terminal → Cancelled

    this.on("cancelPO", async (req) => {
        const db = await cds.connect.to("db");
        const { poId, remarks } = req.data;

        const po = await db.run(SELECT.one(PurchaseOrders).where({ ID: poId }));
        if (!po) return req.error(404, "Purchase Order not found");

        const terminalStatuses = ["Approved", "Cancelled"];
        if (terminalStatuses.includes(po.status))
            return req.error(
                400,
                `Cannot cancel a PO in '${po.status}' status`
            );

        await db.run(
            UPDATE(PurchaseOrders)
                .set({ status: "Cancelled" })
                .where({ ID: poId })
        );

        await logStatusHistory(db, poId, po.status, "Cancelled", remarks, req);

        return await db.run(SELECT.one(PurchaseOrders).where({ ID: poId }));
    });


    // FUNCTION — getDashboardStats

    this.on("getDashboardStats", async (req) => {
        const db = await cds.connect.to("db");

        // all POs
        const allPOs = await db.run(SELECT.from(PurchaseOrders));

        // counts by status
        const countByStatus = (status) =>
            allPOs.filter((po) => po.status === status).length;

        // amount by status
        const amountByStatus = (status) =>
            allPOs
                .filter((po) => po.status === status)
                .reduce((sum, po) => sum + (parseFloat(po.netAmount) || 0), 0);

        // top vendors — group by vendor
        const vendorMap = {};
        allPOs.forEach((po) => {
            if (!po.vendor_ID) return;
            if (!vendorMap[po.vendor_ID]) {
                vendorMap[po.vendor_ID] = {
                    vendorId: po.vendor_ID,
                    vendorName: "",
                    poCount: 0,
                    totalAmount: 0,
                };
            }
            vendorMap[po.vendor_ID].poCount++;
            vendorMap[po.vendor_ID].totalAmount += parseFloat(po.netAmount) || 0;
        });

        // get vendor names
        const vendorIds = Object.keys(vendorMap);
        if (vendorIds.length > 0) {
            const vendors = await db.run(
                SELECT.from(Vendors).where({ ID: { in: vendorIds } })
            );
            vendors.forEach((v) => {
                if (vendorMap[v.ID]) vendorMap[v.ID].vendorName = v.name;
            });
        }

        const topVendors = Object.values(vendorMap)
            .sort((a, b) => b.totalAmount - a.totalAmount)
            .slice(0, 5)
            .map((v) => ({
                ...v,
                totalAmount: parseFloat(v.totalAmount.toFixed(2)),
            }));

        // monthly trend — last 6 months
        const monthlyMap = {};
        allPOs.forEach((po) => {
            if (!po.orderDate) return;
            const month = po.orderDate.substring(0, 7); // YYYY-MM
            if (!monthlyMap[month]) {
                monthlyMap[month] = { month, poCount: 0, totalAmount: 0 };
            }
            monthlyMap[month].poCount++;
            monthlyMap[month].totalAmount += parseFloat(po.netAmount) || 0;
        });

        const monthlyTrend = Object.values(monthlyMap)
            .sort((a, b) => a.month.localeCompare(b.month))
            .slice(-6)
            .map((m) => ({
                ...m,
                totalAmount: parseFloat(m.totalAmount.toFixed(2)),
            }));

        return {
            totalPOs: allPOs.length,
            totalAmount: parseFloat(
                allPOs.reduce((s, p) => s + (parseFloat(p.netAmount) || 0), 0).toFixed(2)
            ),
            draftCount: countByStatus("Draft"),
            submittedCount: countByStatus("Submitted"),
            underReviewCount: countByStatus("UnderReview"),
            approvedCount: countByStatus("Approved"),
            rejectedCount: countByStatus("Rejected"),
            cancelledCount: countByStatus("Cancelled"),
            approvedAmount: parseFloat(amountByStatus("Approved").toFixed(2)),
            pendingAmount: parseFloat(
                (amountByStatus("Submitted") + amountByStatus("UnderReview")).toFixed(2)
            ),
            topVendors,
            monthlyTrend,
        };
    });
});