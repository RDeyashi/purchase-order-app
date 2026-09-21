sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageBox",
    "sap/m/MessageToast",
    "sap/ui/core/Fragment"
], function (Controller, JSONModel, MessageBox, MessageToast, Fragment) {
    "use strict";

    return Controller.extend("com.po.app.poform.controller.Main", {

        // ─────────────────────────────────────────
        // LIFECYCLE
        // ─────────────────────────────────────────
        onInit: function () {
            this._initFormModel();
        },

        // ─────────────────────────────────────────
        // INIT — Local Form Model
        // ─────────────────────────────────────────
        _initFormModel: function () {
            var oModel = new JSONModel({
                // PO Header
                vendor_ID       : "",
                vendorName      : "",
                orderDate       : new Date().toISOString().split("T")[0],
                deliveryDate    : "",
                priority        : "Medium",
                currency        : "INR",
                plant           : "Plant-A",
                department      : "Production",
                paymentTerms    : "Net30",
                deliveryAddress : "",
                remarks         : "",

                // Line Items
                items           : [],

                // Financial Summary
                totalAmount     : "0.00",
                discountAmount  : "0.00",
                taxAmount       : "0.00",
                netAmount       : "0.00"
            });
            this.getView().setModel(oModel, "localForm");
        },

        // ─────────────────────────────────────────
        // NAVIGATION
        // ─────────────────────────────────────────
        onNavBack: function () {
            var oHistory = sap.ui.core.routing.History.getInstance();
            var sPreviousHash = oHistory.getPreviousHash();

            if (sPreviousHash !== undefined) {
                window.history.go(-1);
            } else {
                var oRouter = this.getOwnerComponent().getRouter();
                oRouter.navTo("RouteMain", {}, true);
            }
        },

        // ─────────────────────────────────────────
        // VENDOR VALUE HELP
        // ─────────────────────────────────────────
        onVendorValueHelp: function () {
            var oView = this.getView();

            if (!this._oVendorDialog) {
                Fragment.load({
                    id  : oView.getId(),
                    name: "com.po.app.poform.fragment.VendorValueHelp",
                    controller: this
                }).then(function (oDialog) {
                    this._oVendorDialog = oDialog;
                    oView.addDependent(oDialog);
                    oDialog.setModel(this.getView().getModel());
                    oDialog.open();
                }.bind(this));
            } else {
                this._oVendorDialog.open();
            }
        },

        onVendorSearch: function (oEvent) {
            var sValue = oEvent.getParameter("value");
            var oFilter = new sap.ui.model.Filter(
                "name",
                sap.ui.model.FilterOperator.Contains,
                sValue
            );
            oEvent.getSource().getBinding("items").filter([oFilter]);
        },

        onVendorSelected: function (oEvent) {
            var oSelected = oEvent.getParameter("selectedItem");
            if (oSelected) {
                var oCtx     = oSelected.getBindingContext();
                var oModel   = this.getView().getModel("localForm");
                oModel.setProperty("/vendor_ID",   oCtx.getProperty("ID"));
                oModel.setProperty("/vendorName",  oCtx.getProperty("name"));
            }
        },

        onVendorDialogCancel: function () {
            if (this._oVendorDialog) {
                this._oVendorDialog.close();
            }
        },

        // ─────────────────────────────────────────
        // PRODUCT VALUE HELP
        // ─────────────────────────────────────────
        onProductValueHelp: function (oEvent) {
            var oView = this.getView();
            // Store which row triggered the value help
            this._oCurrentItemContext = oEvent.getSource()
                .getParent().getParent().getBindingContext("localForm");

            if (!this._oProductDialog) {
                Fragment.load({
                    id  : oView.getId(),
                    name: "com.po.app.poform.fragment.ProductValueHelp",
                    controller: this
                }).then(function (oDialog) {
                    this._oProductDialog = oDialog;
                    oView.addDependent(oDialog);
                    oDialog.setModel(this.getView().getModel());
                    oDialog.open();
                }.bind(this));
            } else {
                this._oProductDialog.open();
            }
        },

        onProductSearch: function (oEvent) {
            var sValue = oEvent.getParameter("value");
            var oFilter = new sap.ui.model.Filter(
                "name",
                sap.ui.model.FilterOperator.Contains,
                sValue
            );
            oEvent.getSource().getBinding("items").filter([oFilter]);
        },

        onProductSelected: function (oEvent) {
            var oSelected = oEvent.getParameter("selectedItem");
            if (oSelected && this._oCurrentItemContext) {
                var oCtx      = oSelected.getBindingContext();
                var oFormModel = this.getView().getModel("localForm");
                var sPath     = this._oCurrentItemContext.getPath();

                oFormModel.setProperty(sPath + "/product_ID",   oCtx.getProperty("ID"));
                oFormModel.setProperty(sPath + "/productName",  oCtx.getProperty("name"));
                oFormModel.setProperty(sPath + "/description",  oCtx.getProperty("description"));
                oFormModel.setProperty(sPath + "/uom",          oCtx.getProperty("uom"));
                oFormModel.setProperty(sPath + "/unitPrice",    oCtx.getProperty("basePrice"));

                // recalculate after product selection
                this._recalculateItem(sPath);
                this._recalculateTotals();
            }
        },

        onProductDialogCancel: function () {
            if (this._oProductDialog) {
                this._oProductDialog.close();
            }
        },

        // ─────────────────────────────────────────
        // LINE ITEMS — Add / Delete / Calculate
        // ─────────────────────────────────────────
        onAddLineItem: function () {
            var oModel = this.getView().getModel("localForm");
            var aItems = oModel.getProperty("/items");
            var iNext  = (aItems.length + 1) * 10;

            aItems.push({
                itemNumber  : iNext,
                product_ID  : "",
                productName : "",
                description : "",
                quantity    : 1,
                uom         : "PCS",
                unitPrice   : 0,
                discount    : 0,
                taxRate     : 18,
                totalPrice  : 0
            });

            oModel.setProperty("/items", aItems);
        },

        onDeleteLineItem: function (oEvent) {
            var oModel  = this.getView().getModel("localForm");
            var aItems  = oModel.getProperty("/items");
            var oCtx    = oEvent.getSource().getParent()
                            .getBindingContext("localForm");
            var sPath   = oCtx.getPath();
            var iIndex  = parseInt(sPath.split("/").pop(), 10);

            aItems.splice(iIndex, 1);

            // renumber items
            aItems = aItems.map(function (item, idx) {
                item.itemNumber = (idx + 1) * 10;
                return item;
            });

            oModel.setProperty("/items", aItems);
            this._recalculateTotals();
        },

        onItemChange: function (oEvent) {
            var oCtx  = oEvent.getSource().getParent()
                            .getBindingContext("localForm");
            if (oCtx) {
                this._recalculateItem(oCtx.getPath());
                this._recalculateTotals();
            }
        },

        // ─────────────────────────────────────────
        // CALCULATIONS
        // ─────────────────────────────────────────
        _recalculateItem: function (sPath) {
            var oModel      = this.getView().getModel("localForm");
            var oItem       = oModel.getProperty(sPath);
            var qty         = parseFloat(oItem.quantity)  || 0;
            var unitPrice   = parseFloat(oItem.unitPrice) || 0;
            var discountPct = parseFloat(oItem.discount)  || 0;
            var taxRate     = parseFloat(oItem.taxRate)   || 18;

            var gross       = qty * unitPrice;
            var discountAmt = (gross * discountPct) / 100;
            var taxableAmt  = gross - discountAmt;
            var taxAmt      = (taxableAmt * taxRate) / 100;
            var total       = taxableAmt + taxAmt;

            oModel.setProperty(sPath + "/totalPrice", parseFloat(total.toFixed(2)));
        },

        _recalculateTotals: function () {
            var oModel  = this.getView().getModel("localForm");
            var aItems  = oModel.getProperty("/items");

            var totalAmount   = 0;
            var totalDiscount = 0;
            var totalTax      = 0;

            aItems.forEach(function (item) {
                var qty         = parseFloat(item.quantity)  || 0;
                var unitPrice   = parseFloat(item.unitPrice) || 0;
                var discountPct = parseFloat(item.discount)  || 0;
                var taxRate     = parseFloat(item.taxRate)   || 18;

                var gross       = qty * unitPrice;
                var discountAmt = (gross * discountPct) / 100;
                var taxableAmt  = gross - discountAmt;
                var taxAmt      = (taxableAmt * taxRate) / 100;

                totalAmount   += gross;
                totalDiscount += discountAmt;
                totalTax      += taxAmt;
            });

            var netAmount = totalAmount - totalDiscount + totalTax;

            oModel.setProperty("/totalAmount",    totalAmount.toFixed(2));
            oModel.setProperty("/discountAmount", totalDiscount.toFixed(2));
            oModel.setProperty("/taxAmount",      totalTax.toFixed(2));
            oModel.setProperty("/netAmount",      netAmount.toFixed(2));
        },

        // ─────────────────────────────────────────
        // VALIDATION
        // ─────────────────────────────────────────
        _validateForm: function () {
            var oModel  = this.getView().getModel("localForm");
            var oData   = oModel.getData();
            var aErrors = [];

            if (!oData.vendor_ID) {
                aErrors.push("Vendor is required");
                this.byId("inputVendorName").setValueState("Error");
                this.byId("inputVendorName").setValueStateText("Please select a Vendor");
            } else {
                this.byId("inputVendorName").setValueState("None");
            }

            if (!oData.orderDate) {
                aErrors.push("Order Date is required");
                this.byId("dpOrderDate").setValueState("Error");
            } else {
                this.byId("dpOrderDate").setValueState("None");
            }

            if (!oData.deliveryDate) {
                aErrors.push("Delivery Date is required");
                this.byId("dpDeliveryDate").setValueState("Error");
            } else {
                this.byId("dpDeliveryDate").setValueState("None");
            }

            if (!oData.items || oData.items.length === 0) {
                aErrors.push("At least one line item is required");
            }

            if (aErrors.length > 0) {
                MessageBox.error(
                    "Please fix the following errors:\n\n" + aErrors.join("\n")
                );
                return false;
            }
            return true;
        },

        // ─────────────────────────────────────────
        // ACTIONS — Save Draft / Submit / Cancel
        // ─────────────────────────────────────────
        onSaveDraft: function () {
            var oModel  = this.getView().getModel("localForm");
            var oData   = oModel.getData();

            if (!oData.vendor_ID) {
                MessageBox.error("Please select a Vendor before saving");
                return;
            }

            this._createPO("Draft");
        },

        onSubmit: function () {
            if (!this._validateForm()) return;

            MessageBox.confirm(
                "Are you sure you want to submit this Purchase Order?",
                {
                    title  : "Confirm Submit",
                    onClose: function (sAction) {
                        if (sAction === MessageBox.Action.OK) {
                            this._createPO("Submit");
                        }
                    }.bind(this)
                }
            );
        },

        onCancel: function () {
            MessageBox.confirm(
                "Are you sure you want to cancel? All unsaved changes will be lost.",
                {
                    title  : "Confirm Cancel",
                    onClose: function (sAction) {
                        if (sAction === MessageBox.Action.OK) {
                            this._initFormModel();
                            MessageToast.show("Form cleared");
                        }
                    }.bind(this)
                }
            );
        },

        // ─────────────────────────────────────────
        // CREATE PO — OData V4 Call
        // ─────────────────────────────────────────
        _createPO: function (sAction) {
            var oModel   = this.getView().getModel("localForm");
            var oData    = oModel.getData();
            var oOData   = this.getView().getModel();

            // Build payload
            var oPayload = {
                vendor_ID      : oData.vendor_ID,
                orderDate      : oData.orderDate,
                deliveryDate   : oData.deliveryDate,
                priority       : oData.priority,
                currency_code  : oData.currency,
                plant          : oData.plant,
                department     : oData.department,
                paymentTerms   : oData.paymentTerms,
                deliveryAddress: oData.deliveryAddress,
                remarks        : oData.remarks,
                items          : oData.items.map(function (item, idx) {
                    return {
                        itemNumber : (idx + 1) * 10,
                        product_ID : item.product_ID,
                        description: item.description,
                        quantity   : parseFloat(item.quantity),
                        uom        : item.uom,
                        unitPrice  : parseFloat(item.unitPrice),
                        currency_code: oData.currency,
                        discount   : parseFloat(item.discount) || 0,
                        taxRate    : parseFloat(item.taxRate)  || 18
                    };
                })
            };

            // OData V4 Create
            var oListBinding = oOData.bindList("/PurchaseOrders");
            var oContext     = oListBinding.create(oPayload);

            oContext.created().then(function () {
                var sPoNumber = oContext.getProperty("poNumber");

                if (sAction === "Submit") {
                    // Call submitPO action
                    var oAction = oOData.bindContext(
                        "/POService.submitPO(...)"
                    );
                    oAction.setParameter("poId", oContext.getProperty("ID"));
                    oAction.execute().then(function () {
                        MessageToast.show("PO " + sPoNumber + " submitted successfully!");
                        this._initFormModel();
                    }.bind(this)).catch(function (oError) {
                        MessageBox.error("Submit failed: " + oError.message);
                    });
                } else {
                    MessageToast.show("PO " + sPoNumber + " saved as Draft!");
                    this._initFormModel();
                }
            }.bind(this)).catch(function (oError) {
                MessageBox.error("Failed to create PO: " + oError.message);
            });
        }
    });
});