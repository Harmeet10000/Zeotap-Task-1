import { useState, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "react-toastify";
import { RuleService } from "../api/ruleAPI";
import { ruleSchema, evaluationSchema } from "../schemas/validationSchemas";
import RulesList from "./RulesList"; // Ensure the path is correct

const RuleEngine = () => {
  const [savedRules, setSavedRules] = useState([]);
  const [selectedRule, setSelectedRule] = useState(null);
  const [isCreating, setIsCreating] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register: registerRule,
    handleSubmit: handleRuleSubmit,
    formState: { errors: ruleErrors },
    reset: resetRuleForm,
  } = useForm({ resolver: zodResolver(ruleSchema) });

  const {
    register: registerEval,
    handleSubmit: handleEvalSubmit,
    formState: { errors: evalErrors },
    reset: resetEvalForm,
  } = useForm({ resolver: zodResolver(evaluationSchema) });

  // Fetch all rules on component mount
  useEffect(() => {
    const fetchRules = async () => {
      setIsLoading(true);
      try {
        const rules = await RuleService.getRules();
        console.log("Fetched rules:", rules);
        setSavedRules(rules);
      } catch (error) {
        console.error("Error fetching rules:", error);
        toast.error("Failed to fetch rules.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchRules();
  }, []);

  const convertedData = useMemo(
    () => ({
      age: 0,
      salary: 0,
      experience: 0,
      department: "",
    }),
    []
  );

  const onCreateRule = async (data) => {
    try {
      setIsLoading(true);
      const createdRule = await RuleService.createRule(
        data.ruleName,
        data.ruleString
      );
      toast.success("Rule created successfully!");
      setSavedRules((prev) => [...prev, createdRule]);
      resetRuleForm();
    } catch (error) {
      console.error("Create rule error:", error);
      toast.error(`Failed to create rule: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const onEvaluateRule = async (data) => {
    if (!selectedRule) {
      toast.error("Please select a rule to evaluate.");
      return;
    }

    try {
      setIsLoading(true);
      const result = await RuleService.evaluateRule(selectedRule._id, {
        ...convertedData,
        ...data,
      });
      toast.success(
        result ? "✅ User is eligible!" : "❌ User is not eligible."
      );
      resetEvalForm();
    } catch (error) {
      console.error("Evaluation error:", error);
      toast.error(`Evaluation failed: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 bg-indigo-600">
            <h1 className="text-2xl font-bold text-white">Rule Engine</h1>
          </div>

          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              <button
                onClick={() => setIsCreating(true)}
                className={`py-4 px-6 font-medium text-sm ${
                  isCreating
                    ? "border-b-2 border-indigo-500 text-indigo-600"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                Create Rule
              </button>
              <button
                onClick={() => setIsCreating(false)}
                className={`py-4 px-6 font-medium text-sm ${
                  !isCreating
                    ? "border-b-2 border-indigo-500 text-indigo-600"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                Evaluate Rule
              </button>
            </nav>
          </div>

          <div className="p-6">
            {isLoading ? (
              <div className="text-center">
                <p>Loading...</p>
              </div>
            ) : isCreating ? (
              <form
                onSubmit={handleRuleSubmit(onCreateRule)}
                className="space-y-6"
              >
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Rule Name
                  </label>
                  <input
                    type="text"
                    {...registerRule("ruleName")}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  />
                  {ruleErrors.ruleName && (
                    <p className="text-sm text-red-600">
                      {ruleErrors.ruleName.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Rule Expression
                  </label>
                  <textarea
                    {...registerRule("ruleString")}
                    rows={4}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  />
                  {ruleErrors.ruleString && (
                    <p className="text-sm text-red-600">
                      {ruleErrors.ruleString.message}
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  className="w-full py-2 px-4 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                  disabled={isLoading}
                >
                  Create Rule
                </button>
              </form>
            ) : (
              <>
                <form
                  onSubmit={handleEvalSubmit(onEvaluateRule)}
                  className="space-y-4"
                >
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select Rule
                    </label>
                    <select
                      onChange={(e) =>
                        setSelectedRule(savedRules[e.target.value])
                      }
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    >
                      <option value="">Select a rule...</option>
                      {savedRules.map((rule, index) => (
                        <option key={rule._id} value={index}>
                          {rule.ruleName}
                        </option>
                      ))}
                    </select>
                  </div>

                  {Object.entries({
                    age: "number",
                    department: "text",
                    salary: "number",
                    experience: "number",
                  }).map(([key, type]) => (
                    <div key={key}>
                      <label className="block text-sm font-medium text-gray-700">
                        {key.charAt(0).toUpperCase() + key.slice(1)}
                      </label>
                      <input
                        type={type}
                        {...registerEval(key, {
                          valueAsNumber: type === "number",
                        })}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                      />
                      {evalErrors[key] && (
                        <p className="text-sm text-red-600">
                          {evalErrors[key].message}
                        </p>
                      )}
                    </div>
                  ))}

                  <button
                    type="submit"
                    className="w-full py-2 px-4 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                    disabled={!selectedRule || isLoading}
                  >
                    Evaluate Rule
                  </button>
                </form>

                {/* Display Rules List */}
                <RulesList
                  savedRules={savedRules}
                  setSavedRules={setSavedRules}
                />
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RuleEngine;
