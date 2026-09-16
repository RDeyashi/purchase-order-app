using com.po.app as db from '../db/schema';

@requires: 'authenticated-user'
service POService @(path: '/api/po') {

    @readonly
    // @requires: ['PO_Viewer','PO_Creator','PO_Approver','PO_Admin']
    entity Vendors as projection on db.Vendors {
        ID, name, contactPerson, email, phone,
        country, city, address, taxId, paymentTerms,
        isActive, rating
    } where isActive = true;

    @readonly
    // @requires: ['PO_Viewer','PO_Creator','PO_Approver','PO_Admin']
    entity Products as projection on db.Products {
        ID, code, name, description, category,
        uom, basePrice, currency, manufacturer,
        leadTimeDays, minOrderQty, isActive
    } where isActive = true;

    // @requires: ['PO_Viewer','PO_Creator','PO_Approver','PO_Admin']
    entity PurchaseOrders as projection on db.PurchaseOrders {
        ID, poNumber,
        vendor        : redirected to Vendors,
        orderDate, deliveryDate, status, priority,
        totalAmount, currency, deliveryAddress, plant,
        department, paymentTerms, taxAmount, discountAmount,
        netAmount, remarks, rejectionReason, submittedAt,
        reviewedAt, approvedAt, approvedBy,
        createdAt, createdBy, modifiedAt, modifiedBy,
        items         : redirected to POItems,
        statusHistory : redirected to POStatusHistory
    };

    // @requires: ['PO_Viewer','PO_Creator','PO_Approver','PO_Admin']
    entity POItems as projection on db.POItems {
        ID,
        po      : redirected to PurchaseOrders,
        itemNumber,
        product : redirected to Products,
        description, quantity, uom, unitPrice,
        currency, discount, taxRate, totalPrice,
        deliveryDate, plant, remarks
    };

    @readonly
    // @requires: ['PO_Viewer','PO_Creator','PO_Approver','PO_Admin']
    entity POStatusHistory as projection on db.POStatusHistory {
        ID,
        po : redirected to PurchaseOrders,
        fromStatus, toStatus, changedBy, changedAt, remarks
    };

    // @requires: ['PO_Creator','PO_Admin']
    action submitPO(
        poId    : UUID,
        remarks : String
    ) returns PurchaseOrders;

    // @requires: ['PO_Approver','PO_Admin']
    action reviewPO(
        poId    : UUID,
        remarks : String
    ) returns PurchaseOrders;

    // @requires: ['PO_Approver','PO_Admin']
    action approvePO(
        poId    : UUID,
        remarks : String
    ) returns PurchaseOrders;

    // @requires: ['PO_Approver','PO_Admin']
    action rejectPO(
        poId            : UUID,
        rejectionReason : String not null,
        remarks         : String
    ) returns PurchaseOrders;

    // @requires: ['PO_Creator','PO_Approver','PO_Admin']
    action cancelPO(
        poId    : UUID,
        remarks : String
    ) returns PurchaseOrders;

    // @requires: ['PO_Viewer','PO_Creator','PO_Approver','PO_Admin']
    function getDashboardStats() returns {
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