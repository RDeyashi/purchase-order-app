using com.po.app as db from '../db/schema';

// ─────────────────────────────────────────
// PURCHASE ORDER SERVICE
// ─────────────────────────────────────────
@requires: 'authenticated-user'
service POService @(path: '/api/po') {

    // ─────────────────────────────────────
    // VENDORS — Read only
    // ─────────────────────────────────────
    @readonly
    entity Vendors         as
        projection on db.Vendors {
            ID,
            name,
            contactPerson,
            email,
            phone,
            country,
            city,
            address,
            taxId,
            paymentTerms,
            isActive,
            rating
        }
        where
            isActive = true;

    // ─────────────────────────────────────
    // PRODUCTS — Read only
    // ─────────────────────────────────────
    @readonly
    entity Products        as
        projection on db.Products {
            ID,
            code,
            name,
            description,
            category,
            uom,
            basePrice,
            currency,
            manufacturer,
            leadTimeDays,
            minOrderQty,
            isActive
        }
        where
            isActive = true;

    // ─────────────────────────────────────
    // PURCHASE ORDERS
    // ─────────────────────────────────────
    entity PurchaseOrders  as
        projection on db.PurchaseOrders {
            ID,
            poNumber,
            vendor        : redirected to Vendors,
            orderDate,
            deliveryDate,
            status,
            priority,
            totalAmount,
            currency,
            deliveryAddress,
            plant,
            department,
            paymentTerms,
            taxAmount,
            discountAmount,
            netAmount,
            remarks,
            rejectionReason,
            submittedAt,
            reviewedAt,
            approvedAt,
            approvedBy,
            statusCriticality,
            createdAt,
            createdBy,
            modifiedAt,
            modifiedBy,
            items         : redirected to POItems,
            statusHistory : redirected to POStatusHistory
        };

    // ─────────────────────────────────────
    // PO ITEMS
    // ─────────────────────────────────────
    entity POItems         as
        projection on db.POItems {
            ID,
            po      : redirected to PurchaseOrders,
            itemNumber,
            product : redirected to Products,
            description,
            quantity,
            uom,
            unitPrice,
            currency,
            discount,
            taxRate,
            totalPrice,
            deliveryDate,
            plant,
            remarks
        };

    // ─────────────────────────────────────
    // PO STATUS HISTORY — Read only
    // ─────────────────────────────────────
    @readonly
    entity POStatusHistory as
        projection on db.POStatusHistory {
            ID,
            po : redirected to PurchaseOrders,
            fromStatus,
            toStatus,
            changedBy,
            changedAt,
            remarks
        };

    // ─────────────────────────────────────
    // STATUS & PRIORITY — Distinct value helpers
    // for filter bar dropdowns
    // ─────────────────────────────────────
    @readonly
    entity StatusValues    as select distinct key status as code from db.PurchaseOrders;

    @readonly
    entity PriorityValues  as select distinct key priority as code from db.PurchaseOrders;

    // ─────────────────────────────────────
    // ACTIONS — Status Transitions
    // ─────────────────────────────────────
    action   submitPO(poId: UUID,
                      remarks: String)  returns PurchaseOrders;

    action   reviewPO(poId: UUID,
                      remarks: String)  returns PurchaseOrders;

    action   approvePO(poId: UUID,
                       remarks: String) returns PurchaseOrders;

    action   rejectPO(poId: UUID,
                      rejectionReason: String not null,
                      remarks: String)  returns PurchaseOrders;

    action   cancelPO(poId: UUID,
                      remarks: String)  returns PurchaseOrders;

    // ─────────────────────────────────────
    // FUNCTION — Dashboard Stats
    // ─────────────────────────────────────
    function getDashboardStats()        returns {
        totalPOs         : Integer;
        totalAmount      : Decimal(13, 2);
        draftCount       : Integer;
        submittedCount   : Integer;
        underReviewCount : Integer;
        approvedCount    : Integer;
        rejectedCount    : Integer;
        cancelledCount   : Integer;
        approvedAmount   : Decimal(13, 2);
        pendingAmount    : Decimal(13, 2);
        topVendors       : array of {
            vendorId    : UUID;
            vendorName  : String;
            poCount     : Integer;
            totalAmount : Decimal(13, 2);
        };
        monthlyTrend     : array of {
            month       : String;
            poCount     : Integer;
            totalAmount : Decimal(13, 2);
        };
    };
}

// ─────────────────────────────────────────
// FIELD LABELS — Filter Bar + Form Labels
// ─────────────────────────────────────────
annotate POService.PurchaseOrders with {
    poNumber        @title: 'PO Number';
    vendor          @title: 'Vendor';
    orderDate       @title: 'Order Date';
    deliveryDate    @title: 'Delivery Date';
    status          @title: 'Status';
    priority        @title: 'Priority';
    totalAmount     @title: 'Total Amount';
    currency        @title: 'Currency';
    deliveryAddress @title: 'Delivery Address';
    plant           @title: 'Plant';
    department      @title: 'Department';
    paymentTerms    @title: 'Payment Terms';
    taxAmount       @title: 'Tax Amount';
    discountAmount  @title: 'Discount Amount';
    netAmount       @title: 'Net Amount';
    remarks         @title: 'Remarks';
    rejectionReason @title: 'Rejection Reason';
    submittedAt     @title: 'Submitted At';
    reviewedAt      @title: 'Reviewed At';
    approvedAt      @title: 'Approved At';
    approvedBy      @title: 'Approved By';
}
