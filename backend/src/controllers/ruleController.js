import RuleNode from "../models/RuleNodeModel.js";
import { getRuleEngine } from "../services/ruleEngine.js";

const engine = getRuleEngine();

// Helper function to convert AST to mongoose document structure
export const createMongooseDoc = (node) => {
  if (!node) return null;

  const doc = {
    type: node.type,
  };

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


export const createRule = async (req, res) => {
  try {
    const { ruleString, ruleName } = req.body;
    console.log("Creating rule", ruleName, ruleString);

    if (!ruleString || !ruleName) {
      return res.status(400).json({
        error: "Both ruleString and ruleName are required",
      });
    }

    // Parse the rule string into AST
    const ast = engine.createRule(ruleString);

    // Create the rule document with metadata
    const ruleDoc = {
      ...createMongooseDoc(ast),
      ruleName,
      ruleString,
    };

    const ruleNode = new RuleNode(ruleDoc);
    await ruleNode.save();

    console.log("Rule saved successfully:", {
      ruleName,
      ruleString,
      ast: JSON.stringify(ast, null, 2),
    });

    res.status(201).json({
      message: "Rule created successfully",
      rule: ruleNode,
    });
  } catch (error) {
    console.error("Error creating rule:", error);
    res.status(500).json({
      error: error.message,
      details: "Failed to create rule",
    });
  }
};

export const evaluateRule = async (req, res) => {
  try {
    const { ast, data } = req.body;
    const result = engine.evaluateRule(ast, data);

    res.status(200).json({ eligible: result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getRule = async (req, res) => {
  try {
    const { ruleName } = req.params;
    const rule = await RuleNode.findOne({ ruleName });

    if (!rule) {
      return res.status(404).json({ error: "Rule not found" });
    }

    res.json(rule);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getAllRules = async (req, res) => {
  try {
    const rules = await RuleNode.find({}, { ruleName: 1, ruleString: 1 });
    res.json(rules);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const deleteRule = async (req, res) => {
  try {
    const { ruleId } = req.params;
    const result = await RuleNode.findByIdAndDelete(ruleId);

    if (!result) {
      return res.status(404).json({ error: "Rule not found" });
    }

    res.json({ message: "Rule deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const updateRule = async (req, res) => {
  try {
    const { ruleId } = req.params;
    const { ruleString, ruleName } = req.body;
    console.log("Updating rule", ruleId, ruleName, ruleString);
    // Parse new rule string if provided
    const ast = ruleString ? engine.createRule(ruleString) : null;
    console.log("Updating rule2", ast);

    const updateDoc = createMongooseDoc(ast);
    console.log("Updating rule3", ruleId, ruleName, ruleString);
    if (ruleName) updateDoc.ruleName = ruleName;
    console.log("Updating rule4", ruleId, updateDoc.ruleName);
    if (ruleString) updateDoc.ruleString = ruleString;
    console.log(
      "Updating rule5",
      ruleId,
      updateDoc.ruleName,
      updateDoc.ruleString
    );

    const rule = await RuleNode.findByIdAndUpdate(ruleId, updateDoc, {
      new: true,
    });
    console.log("Updating rule6", rule);

    if (!rule) {
      return res.status(404).json({ error: "Rule not found" });
    }

    res.json(rule);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const combineRules = async (req, res) => {
  try {
    const { ruleIds } = req.body;
    console.log("Combining rules", ruleIds);

    // Fetch the rules to combine
    const rules = await RuleNode.find({ _id: { $in: ruleIds } });

    // Check if all rules exist
    if (rules.length !== ruleIds.length) {
      return res.status(404).json({ error: "One or more rules not found" });
    }

    // Combine the rule strings
    const ruleStrings = rules.map((rule) => rule.ruleString);
    const combinedAST = engine.combineRules(ruleStrings);

    // Create a new rule string from the combined AST for readability
    const ruleString = ruleStrings.join(" AND "); // Adjust as needed

    // Create a new rule name
    const ruleName = `Combined Rule: ${rules
      .map((r) => r.ruleName)
      .join(", ")}`;

    // Create a Mongoose document structure from the combined AST
    const combinedRuleDoc = {
      ...createMongooseDoc(combinedAST),
      ruleName,
      ruleString,
    };

    // Save the combined rule to the database
    const combinedRule = new RuleNode(combinedRuleDoc);
    await combinedRule.save();

    console.log("Combined rule created successfully:", combinedRule);

    res.status(201).json({
      message: "Combined rule created successfully",
      rule: combinedRule,
    });
  } catch (error) {
    console.error("Error combining rules:", error);
    res.status(500).json({ error: error.message });
  }
};