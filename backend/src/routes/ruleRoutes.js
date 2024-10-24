import express from "express";
import { createRule,
    getRule,
    getAllRules,
    deleteRule,
    updateRule,
    evaluateRule,
    combineRules,
    // evaluateUserRule,
    // registerCustomFunction,
 } from "../controllers/ruleController.js";

const router = express.Router();

router.post("/rules", createRule);
router.get("/rules", getAllRules);
router.get("/rules/:ruleName", getRule);
router.put("/rules/:ruleId", updateRule);
router.delete("/rules/:ruleId", deleteRule);
router.post("/rules/:ruleId/evaluate", evaluateRule);
router.post("/rules/combine", combineRules);
// router.post("/evaluate-rule", evaluateUserRule);
// router.post('/register-udf', registerCustomFunction);  


export default router;
