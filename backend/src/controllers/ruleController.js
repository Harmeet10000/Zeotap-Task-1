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
    const { ruleId } = req.params;
    const { data } = req.body;

    // Validate required data fields
    const requiredFields = ["age", "department", "salary", "experience"];
    const missingFields = requiredFields.filter(
      (field) => !data.hasOwnProperty(field)
    );

    if (missingFields.length > 0) {
      return res.status(400).json({
        error: `Missing required fields: ${missingFields.join(", ")}`,
      });
    }

    // Fetch rule from database
    const rule = await RuleNode.findById(ruleId, {
      ruleName: 1,
      ruleString: 1,
    });

    if (!rule) {
      return res.status(404).json({
        error: "Rule not found",
      });
    }

    // Create AST from rule string
    const ast = engine.createRule(rule.ruleString);

    console.log("Evaluating rule", ast, data);
    // console.log("Evaluating rule", JSON.stringify(ast));
    // Evaluate the rule against provided data
    const result = engine.evaluateRule(ast, data);
    // console.log("Rule evaluation result:", result, rule);

    // Return the evaluation result
    res.status(200).json({
      ruleId: rule._id,
      ruleName: rule.ruleName,
      eligible: result,
      evaluatedData: data,
    });
  } catch (error) {
    // Log the error for debugging
    console.error("Rule evaluation error:", error);

    // Determine the appropriate error response
    if (error.message.includes("Missing field")) {
      return res.status(400).json({
        error: "Data validation failed",
        details: error.message,
      });
    }

    if (error.message.includes("Failed to create rule")) {
      return res.status(400).json({
        error: "Invalid rule format",
        details: error.message,
      });
    }

    // Default error response
    res.status(500).json({
      error: "Internal server error",
      details: error.message,
    });
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
    // Parse new rule string if provided
    const ast = ruleString ? engine.createRule(ruleString) : null;

    const updateDoc = createMongooseDoc(ast);
    if (ruleName) updateDoc.ruleName = ruleName;
    if (ruleString) updateDoc.ruleString = ruleString;

    const rule = await RuleNode.findByIdAndUpdate(ruleId, updateDoc, {
      new: true,
    });

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
    // console.log("Combining rules", ruleIds);

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
