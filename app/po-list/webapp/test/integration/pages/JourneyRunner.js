sap.ui.define([
    "sap/fe/test/JourneyRunner",
	"com/po/app/polist/test/integration/pages/PurchaseOrdersList.gen",
	"com/po/app/polist/test/integration/pages/PurchaseOrdersObjectPage.gen"
], function (JourneyRunner, PurchaseOrdersListGenerated, PurchaseOrdersObjectPageGenerated) {
    'use strict';

    const runner = new JourneyRunner({
        launchUrl: sap.ui.require.toUrl('com/po/app/polist') + '/test/flp.html#app-preview',
        pages: {
			onThePurchaseOrdersListGenerated: PurchaseOrdersListGenerated,
			onThePurchaseOrdersObjectPageGenerated: PurchaseOrdersObjectPageGenerated
        },
        async: true
    });

    return runner;
});

