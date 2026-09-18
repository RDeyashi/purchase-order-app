using POService as service from '../../srv/po-service';
annotate service.PurchaseOrders with @(
    UI.FieldGroup #GeneratedGroup : {
        $Type : 'UI.FieldGroupType',
        Data : [
            {
                $Type : 'UI.DataField',
                Label : 'poNumber',
                Value : poNumber,
            },
            {
                $Type : 'UI.DataField',
                Label : 'orderDate',
                Value : orderDate,
            },
            {
                $Type : 'UI.DataField',
                Label : 'deliveryDate',
                Value : deliveryDate,
            },
            {
                $Type : 'UI.DataField',
                Label : 'status',
                Value : status,
            },
            {
                $Type : 'UI.DataField',
                Label : 'priority',
                Value : priority,
            },
            {
                $Type : 'UI.DataField',
                Label : 'totalAmount',
                Value : totalAmount,
            },
            {
                $Type : 'UI.DataField',
                Label : 'currency_code',
                Value : currency_code,
            },
            {
                $Type : 'UI.DataField',
                Label : 'deliveryAddress',
                Value : deliveryAddress,
            },
            {
                $Type : 'UI.DataField',
                Label : 'plant',
                Value : plant,
            },
            {
                $Type : 'UI.DataField',
                Label : 'department',
                Value : department,
            },
            {
                $Type : 'UI.DataField',
                Label : 'paymentTerms',
                Value : paymentTerms,
            },
            {
                $Type : 'UI.DataField',
                Label : 'taxAmount',
                Value : taxAmount,
            },
            {
                $Type : 'UI.DataField',
                Label : 'discountAmount',
                Value : discountAmount,
            },
            {
                $Type : 'UI.DataField',
                Label : 'netAmount',
                Value : netAmount,
            },
            {
                $Type : 'UI.DataField',
                Label : 'remarks',
                Value : remarks,
            },
            {
                $Type : 'UI.DataField',
                Label : 'rejectionReason',
                Value : rejectionReason,
            },
            {
                $Type : 'UI.DataField',
                Label : 'submittedAt',
                Value : submittedAt,
            },
            {
                $Type : 'UI.DataField',
                Label : 'reviewedAt',
                Value : reviewedAt,
            },
            {
                $Type : 'UI.DataField',
                Label : 'approvedAt',
                Value : approvedAt,
            },
            {
                $Type : 'UI.DataField',
                Label : 'approvedBy',
                Value : approvedBy,
            },
        ],
    },
    UI.Facets : [
        {
            $Type : 'UI.ReferenceFacet',
            ID : 'GeneratedFacet1',
            Label : 'General Information',
            Target : '@UI.FieldGroup#GeneratedGroup',
        },
    ],
    UI.LineItem : [
        {
            $Type : 'UI.DataField',
            Label : 'poNumber',
            Value : poNumber,
        },
        {
            $Type : 'UI.DataField',
            Label : 'orderDate',
            Value : orderDate,
        },
        {
            $Type : 'UI.DataField',
            Label : 'deliveryDate',
            Value : deliveryDate,
        },
        {
            $Type : 'UI.DataField',
            Label : 'status',
            Value : status,
        },
        {
            $Type : 'UI.DataField',
            Label : 'priority',
            Value : priority,
        },
    ],
);

annotate service.PurchaseOrders with {
    vendor @Common.ValueList : {
        $Type : 'Common.ValueListType',
        CollectionPath : 'Vendors',
        Parameters : [
            {
                $Type : 'Common.ValueListParameterInOut',
                LocalDataProperty : vendor_ID,
                ValueListProperty : 'ID',
            },
            {
                $Type : 'Common.ValueListParameterDisplayOnly',
                ValueListProperty : 'name',
            },
            {
                $Type : 'Common.ValueListParameterDisplayOnly',
                ValueListProperty : 'contactPerson',
            },
            {
                $Type : 'Common.ValueListParameterDisplayOnly',
                ValueListProperty : 'email',
            },
            {
                $Type : 'Common.ValueListParameterDisplayOnly',
                ValueListProperty : 'phone',
            },
        ],
    }
};

