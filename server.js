const cds = require("@sap/cds");
const rateLimit = require("express-rate-limit");


// RATE LIMITERS

// General API limiter — all endpoints
const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,  // 15 minutes window
    max: 500,              // 500 requests per window per IP
    standardHeaders: true,             // Return rate limit info in headers
    legacyHeaders: false,
    message: {
        error: {
            code: "429",
            message: "Too many requests. Please try again after 15 minutes."
        }
    },
    keyGenerator: (req) => {
        // Rate limit per user if authenticated, otherwise per IP
        return req.user?.id || req.ip;
    },
    skip: (req) => {
        // Skip rate limiting for health checks and metadata
        return req.path === "/health" || req.path.includes("$metadata");
    }
});

// Strict limiter — write operations only
const writeLimiter = rateLimit({
    windowMs: 1 * 60 * 1000,   // 1 minute window
    max: 30,               // 30 write requests per minute per user
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        error: {
            code: "429",
            message: "Too many write requests. Please slow down."
        }
    },
    keyGenerator: (req) => {
        return req.user?.id || req.ip;
    }
});

// Action limiter — CAP actions (submitPO, approvePO etc)
const actionLimiter = rateLimit({
    windowMs: 1 * 60 * 1000,   // 1 minute window
    max: 10,               // 10 action calls per minute per user
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        error: {
            code: "429",
            message: "Too many action requests. Please wait a moment."
        }
    },
    keyGenerator: (req) => {
        return req.user?.id || req.ip;
    }
});


// BOOTSTRAP — Extend CDS Express App
cds.on("bootstrap", (app) => {

    // Apply general limiter to all API routes
    app.use("/api/", generalLimiter);

    // Apply write limiter to POST/PUT/PATCH/DELETE
    app.use("/api/", (req, res, next) => {
        if (["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) {
            return writeLimiter(req, res, next);
        }
        next();
    });

    // Apply action limiter to OData actions
    // CAP actions come as POST to /api/po/submitPO etc
    app.use("/api/po/submitPO", actionLimiter);
    app.use("/api/po/approvePO", actionLimiter);
    app.use("/api/po/rejectPO", actionLimiter);
    app.use("/api/po/reviewPO", actionLimiter);
    app.use("/api/po/cancelPO", actionLimiter);

    // Health check endpoint — no rate limit
    app.get("/health", (req, res) => {
        res.json({
            status: "UP",
            timestamp: new Date().toISOString(),
            service: "purchase-order-app"
        });
    });
});


// START CDS SERVER
module.exports = cds.server;