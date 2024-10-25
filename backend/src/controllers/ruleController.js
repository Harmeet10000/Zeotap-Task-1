import RuleNode from "../models/RuleNodeModel.js";
import { getRuleEngine } from "../services/ruleEngine.js";
import mongoose from "mongoose";

const engine = getRuleEngine();

// Helper function to safely convert AST to a Mongoose document structure
export const createMongooseDoc = (node) => {
  if (!node) return null;
  const doc = { type: node.type };

  if (node.type === "operator") {
    doc.operator = node.operator;
    doc.left = createMongooseDoc(node.left);
    doc.right = createMongooseDoc(node.right);
  } else if (node.type === "comparison") {
    doc.operator = node.operator;
    doc.field = node.field;
    doc.value = node.value;
  }

  return doc;
};

// Helper to validate MongoDB IDs
const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

// Create a new rule
export const createRule = async (req, res) => {
  try {
    const { ruleString, ruleName } = req.body;

    if (!ruleString || !ruleName) {
      return res
        .status(400)
        .json({ error: "Both ruleString and ruleName are required" });
    }

    const ast = engine.createRule(ruleString); // Parse the rule string into AST
    const ruleDoc = { ...createMongooseDoc(ast), ruleName, ruleString };

    const ruleNode = new RuleNode(ruleDoc);
    await ruleNode.save();

    res
      .status(201)
      .json({ message: "Rule created successfully", rule: ruleNode });
  } catch (error) {
    console.error("Error creating rule:", error);
    res
      .status(500)
      .json({ error: "Failed to create rule", details: error.message });
  }
};

// Evaluate a rule with provided data
export const evaluateRule = async (req, res) => {
  try {
    const { ruleId } = req.params;
    const { data } = req.body;

    if (!isValidObjectId(ruleId)) {
      return res.status(400).json({ error: "Invalid rule ID" });
    }

    const requiredFields = ["age", "department", "salary", "experience"];
    const missingFields = requiredFields.filter((field) => !(field in data));

    if (missingFields.length > 0) {
      return res.status(400).json({
        error: `Missing required fields: ${missingFields.join(", ")}`,
      });
    }

    const rule = await RuleNode.findById(ruleId, {
      ruleName: 1,
      ruleString: 1,
    });
    if (!rule) return res.status(404).json({ error: "Rule not found" });

    const ast = engine.createRule(rule.ruleString); // Create AST from rule string
    const result = engine.evaluateRule(ast, data); // Evaluate the rule

    res.status(200).json({
      ruleId: rule._id,
      ruleName: rule.ruleName,
      eligible: result,
      data,
    });
  } catch (error) {
    console.error("Rule evaluation error:", error);
    res
      .status(500)
      .json({ error: "Internal server error", details: error.message });
  }
};

// Fetch a rule by name
export const getRule = async (req, res) => {
  try {
    const { ruleName } = req.params;
    const rule = await RuleNode.findOne({ ruleName });

    if (!rule) return res.status(404).json({ error: "Rule not found" });
    res.json(rule);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Fetch all rules
export const getAllRules = async (req, res) => {
  try {
    const rules = await RuleNode.find({}, { ruleName: 1, ruleString: 1 });
    res.json(rules);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Delete a rule by ID
export const deleteRule = async (req, res) => {
  try {
    const { ruleId } = req.params;

    if (!isValidObjectId(ruleId)) {
      return res.status(400).json({ error: "Invalid rule ID" });
    }

    const result = await RuleNode.findByIdAndDelete(ruleId);
    if (!result) return res.status(404).json({ error: "Rule not found" });

    res.json({ message: "Rule deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update a rule by ID
export const updateRule = async (req, res) => {
  try {
    const { ruleId } = req.params;
    const { ruleString, ruleName } = req.body;

    if (!isValidObjectId(ruleId)) {
      return res.status(400).json({ error: "Invalid rule ID" });
    }

    const ast = ruleString ? engine.createRule(ruleString) : null;
    const updateDoc = createMongooseDoc(ast);
    if (ruleName) updateDoc.ruleName = ruleName;
    if (ruleString) updateDoc.ruleString = ruleString;

    const rule = await RuleNode.findByIdAndUpdate(ruleId, updateDoc, {
      new: true,
    });
    if (!rule) return res.status(404).json({ error: "Rule not found" });

    res.json(rule);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Combine multiple rules into one
export const combineRules = async (req, res) => {
  try {
    const { ruleIds } = req.body;

    const rules = await RuleNode.find({ _id: { $in: ruleIds } });
    if (rules.length !== ruleIds.length)
      return res.status(404).json({ error: "One or more rules not found" });

    const ruleStrings = rules.map((rule) => rule.ruleString);
    const combinedAST = engine.combineRules(ruleStrings);
    const ruleName = `Combined Rule: ${rules
      .map((r) => r.ruleName)
      .join(", ")}`;

    const combinedRuleDoc = {
      ...createMongooseDoc(combinedAST),
      ruleName,
      ruleString: ruleStrings.join(" AND "),
    };
    const combinedRule = new RuleNode(combinedRuleDoc);
    await combinedRule.save();

    res.status(201).json({
      message: "Combined rule created successfully",
      rule: combinedRule,
    });
  } catch (error) {
    console.error("Error combining rules:", error);
    res.status(500).json({ error: error.message });
  }
};

// export const evaluateUserRule = async (req, res) => {
//   const { ast, data } = req.body;

//   try {
//     const result = engine.evaluateRule(ast, data);
//     res.status(200).json({ success: true, result });
//   } catch (error) {
//     res.status(400).json({ success: false, message: error.message });
//   }
// };

// export const registerCustomFunction = async (req, res) => {
//   const { name, fnBody } = req.body; // Expecting 'name' and 'fnBody' in the request

//   try {
//     // Convert the function body from string to a real function
//     const fn = new Function(`return ${fnBody}`)();

//     // Register the function with the engine
//     engine.registerFunction(name, fn);

//     res.status(200).json({
//       success: true,
//       message: `Function '${name}' registered successfully.`,
//     });
//   } catch (error) {
//     console.error(`Failed to register function: ${error.message}`);
//     res.status(400).json({
//       success: false,
//       message: `Failed to register function: ${error.message}`,
//     });
//   }
// };
