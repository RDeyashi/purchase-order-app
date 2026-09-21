using POService as service from '../../srv/po-service';

// ─────────────────────────────────────────
// PURCHASE ORDERS — LIST REPORT + OBJECT PAGE
// ─────────────────────────────────────────
annotate service.PurchaseOrders with @(
    // ─────────────────────────────────────
    // LINE ITEM — List Report Columns
    // ─────────────────────────────────────
    UI.LineItem                    : [
        {
            $Type            : 'UI.DataField',
            Label            : 'PO Number',
            Value            : poNumber,
            ![@UI.Importance]: #High
        },
        {
            $Type            : 'UI.DataField',
            Label            : 'Vendor',
            Value            : vendor.name,
            ![@UI.Importance]: #High
        },
        {
            $Type            : 'UI.DataField',
            Label            : 'Order Date',
            Value            : orderDate,
            ![@UI.Importance]: #High
        },
        {
            $Type            : 'UI.DataField',
            Label            : 'Delivery Date',
            Value            : deliveryDate,
            ![@UI.Importance]: #Medium
        },
        {
            $Type            : 'UI.DataField',
            Label            : 'Status',
            Value            : status,
            Criticality      : statusCriticality,
            ![@UI.Importance]: #High
        },
        {
            $Type            : 'UI.DataField',
            Label            : 'Priority',
            Value            : priority,
            ![@UI.Importance]: #Medium
        },
        {
            $Type            : 'UI.DataField',
            Label            : 'Net Amount',
            Value            : netAmount,
            ![@UI.Importance]: #High
        },
        {
            $Type            : 'UI.DataField',
            Label            : 'Currency',
            Value            : currency_code,
            ![@UI.Importance]: #Medium
        },
        {
            $Type            : 'UI.DataField',
            Label            : 'Plant',
            Value            : plant,
            ![@UI.Importance]: #Low
        },
        {
            $Type            : 'UI.DataField',
            Label            : 'Department',
            Value            : department,
            ![@UI.Importance]: #Low
        }
    ],

    // ─────────────────────────────────────
    // SELECTION FIELDS — Filter Bar
    // ─────────────────────────────────────
    UI.SelectionFields             : [
        status,
        priority,
        vendor_ID,
        orderDate,
        plant,
        department
    ],

    // ─────────────────────────────────────
    // HEADER INFO — Object Page Title
    // ─────────────────────────────────────
    UI.HeaderInfo                  : {
        TypeName      : 'Purchase Order',
        TypeNamePlural: 'Purchase Orders',
        Title         : {
            $Type: 'UI.DataField',
            Value: poNumber
        },
        Description   : {
            $Type: 'UI.DataField',
            Value: vendor.name
        }
    },

    // ─────────────────────────────────────
    // HEADER FACETS — Object Page Header KPIs
    // ─────────────────────────────────────
    UI.HeaderFacets                : [
        {
            $Type : 'UI.ReferenceFacet',
            Target: '@UI.FieldGroup#HeaderStatus'
        },
        {
            $Type : 'UI.ReferenceFacet',
            Target: '@UI.FieldGroup#HeaderAmount'
        }
    ],

    // ─────────────────────────────────────
    // FIELD GROUPS — Header KPI blocks
    // ─────────────────────────────────────
    UI.FieldGroup #HeaderStatus    : {Data: [
        {
            $Type      : 'UI.DataField',
            Label      : 'Status',
            Value      : status,
            Criticality: statusCriticality
        },
        {
            $Type: 'UI.DataField',
            Label: 'Priority',
            Value: priority
        }
    ]},

    UI.FieldGroup #HeaderAmount    : {Data: [
        {
            $Type: 'UI.DataField',
            Label: 'Net Amount',
            Value: netAmount
        },
        {
            $Type: 'UI.DataField',
            Label: 'Currency',
            Value: currency_code
        }
    ]},

    // ─────────────────────────────────────
    // FACETS — Object Page Tabs
    // ─────────────────────────────────────
    UI.Facets                      : [
        {
            $Type : 'UI.CollectionFacet',
            ID    : 'GeneralInfo',
            Label : 'General Information',
            Facets: [
                {
                    $Type : 'UI.ReferenceFacet',
                    ID    : 'PODetails',
                    Label : 'PO Details',
                    Target: '@UI.FieldGroup#PODetails'
                },
                {
                    $Type : 'UI.ReferenceFacet',
                    ID    : 'VendorDetails',
                    Label : 'Vendor Details',
                    Target: '@UI.FieldGroup#VendorDetails'
                },
                {
                    $Type : 'UI.ReferenceFacet',
                    ID    : 'DeliveryDetails',
                    Label : 'Delivery Details',
                    Target: '@UI.FieldGroup#DeliveryDetails'
                }
            ]
        },
        {
            $Type : 'UI.CollectionFacet',
            ID    : 'FinancialInfo',
            Label : 'Financial Summary',
            Facets: [{
                $Type : 'UI.ReferenceFacet',
                ID    : 'FinancialDetails',
                Label : 'Amount Details',
                Target: '@UI.FieldGroup#FinancialDetails'
            }]
        },
        {
            $Type : 'UI.ReferenceFacet',
            ID    : 'LineItemsFacet',
            Label : 'Line Items',
            Target: 'items/@UI.LineItem'
        },
        {
            $Type : 'UI.ReferenceFacet',
            ID    : 'StatusHistoryFacet',
            Label : 'Status History',
            Target: 'statusHistory/@UI.LineItem'
        }
    ],

    // ─────────────────────────────────────
    // FIELD GROUPS — Object Page Sections
    // ─────────────────────────────────────
    UI.FieldGroup #PODetails       : {
        $Type: 'UI.FieldGroupType',
        Data : [
            {
                $Type: 'UI.DataField',
                Label: 'PO Number',
                Value: poNumber
            },
            {
                $Type: 'UI.DataField',
                Label: 'Order Date',
                Value: orderDate
            },
            {
                $Type: 'UI.DataField',
                Label: 'Delivery Date',
                Value: deliveryDate
            },
            {
                $Type      : 'UI.DataField',
                Label      : 'Status',
                Value      : status,
                Criticality: statusCriticality
            },
            {
                $Type: 'UI.DataField',
                Label: 'Priority',
                Value: priority
            },
            {
                $Type: 'UI.DataField',
                Label: 'Department',
                Value: department
            },
            {
                $Type: 'UI.DataField',
                Label: 'Plant',
                Value: plant
            },
            {
                $Type: 'UI.DataField',
                Label: 'Payment Terms',
                Value: paymentTerms
            },
            {
                $Type: 'UI.DataField',
                Label: 'Remarks',
                Value: remarks
            },
            {
                $Type: 'UI.DataField',
                Label: 'Rejection Reason',
                Value: rejectionReason
            }
        ]
    },

    UI.FieldGroup #VendorDetails   : {
        $Type: 'UI.FieldGroupType',
        Data : [
            {
                $Type: 'UI.DataField',
                Label: 'Vendor Name',
                Value: vendor.name
            },
            {
                $Type: 'UI.DataField',
                Label: 'Contact Person',
                Value: vendor.contactPerson
            },
            {
                $Type: 'UI.DataField',
                Label: 'Email',
                Value: vendor.email
            },
            {
                $Type: 'UI.DataField',
                Label: 'Phone',
                Value: vendor.phone
            },
            {
                $Type: 'UI.DataField',
                Label: 'Country',
                Value: vendor.country
            },
            {
                $Type: 'UI.DataField',
                Label: 'Payment Terms',
                Value: vendor.paymentTerms
            },
            {
                $Type: 'UI.DataField',
                Label: 'Vendor Rating',
                Value: vendor.rating
            }
        ]
    },

    UI.FieldGroup #DeliveryDetails : {
        $Type: 'UI.FieldGroupType',
        Data : [
            {
                $Type: 'UI.DataField',
                Label: 'Delivery Address',
                Value: deliveryAddress
            },
            {
                $Type: 'UI.DataField',
                Label: 'Submitted At',
                Value: submittedAt
            },
            {
                $Type: 'UI.DataField',
                Label: 'Reviewed At',
                Value: reviewedAt
            },
            {
                $Type: 'UI.DataField',
                Label: 'Approved At',
                Value: approvedAt
            },
            {
                $Type: 'UI.DataField',
                Label: 'Approved By',
                Value: approvedBy
            }
        ]
    },

    UI.FieldGroup #FinancialDetails: {
        $Type: 'UI.FieldGroupType',
        Data : [
            {
                $Type: 'UI.DataField',
                Label: 'Total Amount',
                Value: totalAmount
            },
            {
                $Type: 'UI.DataField',
                Label: 'Discount Amount',
                Value: discountAmount
            },
            {
                $Type: 'UI.DataField',
                Label: 'Tax Amount',
                Value: taxAmount
            },
            {
                $Type: 'UI.DataField',
                Label: 'Net Amount',
                Value: netAmount
            },
            {
                $Type: 'UI.DataField',
                Label: 'Currency',
                Value: currency_code
            }
        ]
    }
);

// ─────────────────────────────────────────
// VENDOR — Text + Value Help
// ─────────────────────────────────────────
annotate service.PurchaseOrders with {
    vendor @(
        Common.Text                    : vendor.name,
        Common.TextArrangement         : #TextOnly,
        Common.ValueList               : {
            $Type         : 'Common.ValueListType',
            CollectionPath: 'Vendors',
            Parameters    : [
                {
                    $Type            : 'Common.ValueListParameterInOut',
                    LocalDataProperty: vendor_ID,
                    ValueListProperty: 'ID'
                },
                {
                    $Type            : 'Common.ValueListParameterDisplayOnly',
                    ValueListProperty: 'name'
                },
                {
                    $Type            : 'Common.ValueListParameterDisplayOnly',
                    ValueListProperty: 'contactPerson'
                }
            ]
        },
        Common.ValueListWithFixedValues: false
    );
}

// ─────────────────────────────────────────
// STATUS — Distinct dropdown via StatusValues
// ─────────────────────────────────────────
annotate service.PurchaseOrders with {
    status @(
        Common.ValueListWithFixedValues: true,
        Common.ValueList               : {
            $Type         : 'Common.ValueListType',
            CollectionPath: 'StatusValues',
            Parameters    : [{
                $Type            : 'Common.ValueListParameterInOut',
                LocalDataProperty: status,
                ValueListProperty: 'code'
            }]
        }
    );
}

// ─────────────────────────────────────────
// PRIORITY — Distinct dropdown via PriorityValues
// ─────────────────────────────────────────
annotate service.PurchaseOrders with {
    priority @(
        Common.ValueListWithFixedValues: true,
        Common.ValueList               : {
            $Type         : 'Common.ValueListType',
            CollectionPath: 'PriorityValues',
            Parameters    : [{
                $Type            : 'Common.ValueListParameterInOut',
                LocalDataProperty: priority,
                ValueListProperty: 'code'
            }]
        }
    );
}

// ─────────────────────────────────────────
// STATUS CRITICALITY — hidden computed field
// ─────────────────────────────────────────
annotate service.PurchaseOrders with {
    statusCriticality @UI.Hidden
}

// ─────────────────────────────────────────
// PO ITEMS — Line Items Tab Columns
// ─────────────────────────────────────────
annotate service.POItems with @(UI.LineItem: [
    {
        $Type: 'UI.DataField',
        Label: 'Item No.',
        Value: itemNumber
    },
    {
        $Type: 'UI.DataField',
        Label: 'Product',
        Value: product.name
    },
    {
        $Type: 'UI.DataField',
        Label: 'Description',
        Value: description
    },
    {
        $Type: 'UI.DataField',
        Label: 'Quantity',
        Value: quantity
    },
    {
        $Type: 'UI.DataField',
        Label: 'UOM',
        Value: uom
    },
    {
        $Type: 'UI.DataField',
        Label: 'Unit Price',
        Value: unitPrice
    },
    {
        $Type: 'UI.DataField',
        Label: 'Discount %',
        Value: discount
    },
    {
        $Type: 'UI.DataField',
        Label: 'Tax Rate %',
        Value: taxRate
    },
    {
        $Type: 'UI.DataField',
        Label: 'Total Price',
        Value: totalPrice
    },
    {
        $Type: 'UI.DataField',
        Label: 'Delivery Date',
        Value: deliveryDate
    }
]);

// ─────────────────────────────────────────
// STATUS HISTORY — Status History Tab Columns
// ─────────────────────────────────────────
annotate service.POStatusHistory with @(UI.LineItem: [
    {
        $Type: 'UI.DataField',
        Label: 'Changed At',
        Value: changedAt
    },
    {
        $Type: 'UI.DataField',
        Label: 'Changed By',
        Value: changedBy
    },
    {
        $Type: 'UI.DataField',
        Label: 'From Status',
        Value: fromStatus
    },
    {
        $Type: 'UI.DataField',
        Label: 'To Status',
        Value: toStatus
    },
    {
        $Type: 'UI.DataField',
        Label: 'Remarks',
        Value: remarks
    }
]);

// ─────────────────────────────────────────
// EDIT CAPABILITIES
// ─────────────────────────────────────────
annotate service.PurchaseOrders with @(
    Capabilities.UpdateRestrictions: {Updatable: true},
    Capabilities.DeleteRestrictions: {Deletable: false}
);

// ─────────────────────────────────────────
// ACTION BUTTONS — Object Page toolbar
// ─────────────────────────────────────────
annotate service.PurchaseOrders with @(UI.Identification: [
    {
        $Type : 'UI.DataFieldForAction',
        Label : 'Submit for Review',
        Action: 'POService.submitPO'
    },
    {
        $Type : 'UI.DataFieldForAction',
        Label : 'Start Review',
        Action: 'POService.reviewPO'
    },
    {
        $Type : 'UI.DataFieldForAction',
        Label : 'Approve',
        Action: 'POService.approvePO'
    },
    {
        $Type : 'UI.DataFieldForAction',
        Label : 'Reject',
        Action: 'POService.rejectPO'
    },
    {
        $Type : 'UI.DataFieldForAction',
        Label : 'Cancel PO',
        Action: 'POService.cancelPO'
    }
]);
