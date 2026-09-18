namespace com.po.app;

using {
    Currency,
    managed,
    cuid
} from '@sap/cds/common';

// ─────────────────────────────────────────
// ENUM TYPES
// ─────────────────────────────────────────
@assert.range
type StatusType   : String enum {
    Draft = 'Draft';
    Submitted = 'Submitted';
    UnderReview = 'UnderReview';
    Approved = 'Approved';
    Rejected = 'Rejected';
    Cancelled = 'Cancelled';
}

@assert.range
type PriorityType : String enum {
    Low = 'Low';
    Medium = 'Medium';
    High = 'High';
    Critical = 'Critical';
}

// ─────────────────────────────────────────
// VENDOR
// ─────────────────────────────────────────
entity Vendors : cuid, managed {
    name          : String(100) not null;
    contactPerson : String(100);
    email         : String(100);
    phone         : String(20);
    country       : String(3); // ISO code: IND, USA, DEU
    city          : String(50);
    address       : String(255);
    taxId         : String(50);
    paymentTerms  : String(50); // Net30, Net60, Immediate
    isActive      : Boolean default true;
    rating        : Decimal(2, 1); // 1.0 to 5.0
}

// ─────────────────────────────────────────
// PRODUCT / MATERIAL
// ─────────────────────────────────────────
entity Products : cuid, managed {
    code         : String(20) not null;
    name         : String(100) not null;
    description  : String(500);
    category     : String(50); // RawMaterial, Machinery, SpareParts, Consumables
    uom          : String(10); // KG, LTR, PCS, MTR, SET
    basePrice    : Decimal(13, 2);
    currency     : Currency;
    manufacturer : String(100);
    leadTimeDays : Integer; // procurement lead time
    minOrderQty  : Decimal(13, 3);
    isActive     : Boolean default true;
}

// ─────────────────────────────────────────
// PURCHASE ORDER
// ─────────────────────────────────────────
entity PurchaseOrders : cuid, managed {
    poNumber          : String(20);
    vendor            : Association to Vendors;
    orderDate         : Date not null;
    deliveryDate      : Date;
    status            : StatusType default 'Draft';
    priority          : PriorityType default 'Medium';
    totalAmount       : Decimal(13, 2);
    currency          : Currency;
    deliveryAddress   : String(255);
    plant             : String(50);
    department        : String(50);
    paymentTerms      : String(50);
    taxAmount         : Decimal(13, 2);
    discountAmount    : Decimal(13, 2);
    netAmount         : Decimal(13, 2);
    remarks           : String(1000);
    rejectionReason   : String(500);
    submittedAt       : DateTime;
    reviewedAt        : DateTime;
    approvedAt        : DateTime;
    approvedBy        : String(100);
    statusCriticality : Integer default 0;
    items             : Composition of many POItems
                            on items.po = $self;
    statusHistory     : Composition of many POStatusHistory
                            on statusHistory.po = $self;
}

// ─────────────────────────────────────────
// PURCHASE ORDER ITEMS
// ─────────────────────────────────────────
entity POItems : cuid, managed {
    po           : Association to PurchaseOrders;
    itemNumber   : Integer;
    product      : Association to Products;
    description  : String(500);
    quantity     : Decimal(13, 3) not null;
    uom          : String(10);
    unitPrice    : Decimal(13, 2) not null;
    currency     : Currency;
    discount     : Decimal(5, 2) default 0;
    taxRate      : Decimal(5, 2) default 18;
    totalPrice   : Decimal(13, 2);
    deliveryDate : Date;
    plant        : String(50);
    remarks      : String(500);
}

// ─────────────────────────────────────────
// PO STATUS HISTORY (audit trail)
// ─────────────────────────────────────────
entity POStatusHistory : cuid, managed {
    po         : Association to PurchaseOrders;
    fromStatus : String(20);
    toStatus   : String(20);
    changedBy  : String(100);
    changedAt  : DateTime;
    remarks    : String(500);
}