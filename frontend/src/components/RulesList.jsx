/* eslint-disable react/prop-types */
import { useState, useRef, useCallback } from "react";
import { toast } from "react-toastify";
import { RuleService } from "../api/ruleAPI";

const RulesList = ({ savedRules, setSavedRules }) => {
  const [editingRuleId, setEditingRuleId] = useState(null);
  const [editedName, setEditedName] = useState("");
  const [editedString, setEditedString] = useState("");
  const [selectedRules, setSelectedRules] = useState([]);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(null); // Track rule being deleted
  const textareaRef = useRef(null);

  // Handle Checkbox Selection (memoized with useCallback)
  const handleSelectRule = useCallback((ruleId) => {
    setSelectedRules((prevSelected) =>
      prevSelected.includes(ruleId)
        ? prevSelected.filter((id) => id !== ruleId)
        : [...prevSelected, ruleId]
    );
  }, []);

  // Combine Selected Rules
  const handleCombineRules = async () => {
    if (selectedRules.length < 2) {
      toast.error("Select at least two rules to combine.");
      return;
    }

    try {
      const combinedRule = await RuleService.combineRules(selectedRules);
      setSavedRules((prev) => [...prev, combinedRule]);
      setSelectedRules([]); // Clear selected rules
      toast.success("Rules combined successfully!");
    } catch (error) {
      toast.error(`Failed to combine rules: ${error.message}`);
    }
  };

  // Handle Delete with Undo Option
  const handleDelete = async (ruleId) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this rule? This action cannot be undone."
    );
    if (!confirmDelete) return;

    try {
      setIsDeleting(ruleId); // Set loading state for delete
      await RuleService.deleteRule(ruleId);
      setSavedRules((prev) => prev.filter((rule) => rule._id !== ruleId));
      toast.success("Rule deleted successfully.");
    } catch (error) {
      toast.error(`Failed to delete rule: ${error.message}`);
    } finally {
      setIsDeleting(null); // Reset loading state
    }
  };

  // Handle Edit Start
  const handleEdit = (rule) => {
    setEditingRuleId(rule._id);
    setEditedName(rule.ruleName);
    setEditedString(rule.ruleString);
    adjustTextareaHeight();
  };

  // Handle Update
  const handleUpdate = async (ruleId) => {
    const confirmUpdate = window.confirm(
      "Are you sure you want to update this rule?"
    );
    if (!confirmUpdate) return;

    try {
      setIsUpdating(true); // Set loading state
      const updatedRule = await RuleService.updateRule(ruleId, {
        ruleName: editedName,
        ruleString: editedString,
      });

      setSavedRules((prev) =>
        prev.map((rule) => (rule._id === ruleId ? updatedRule : rule))
      );
      setEditingRuleId(null);
      toast.success("Rule updated successfully.");
    } catch (error) {
      toast.error(`Failed to update rule: ${error.message}`);
    } finally {
      setIsUpdating(false); // Reset loading state
    }
  };

  // Adjust textarea height to fit content
  const adjustTextareaHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Saved Rules</h1>
        <button
          onClick={handleCombineRules}
          disabled={selectedRules.length < 2}
          className={`bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 ${
            selectedRules.length < 2 ? "opacity-50 cursor-not-allowed" : ""
          }`}
        >
          Combine Selected Rules
        </button>
      </div>

      {savedRules.length === 0 ? (
        <p>No rules found.</p>
      ) : (
        <div className="overflow-auto">
          <table className="w-full border-collapse border border-gray-300 min-w-[800px]">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-300 px-4 py-2">Select</th>
                <th className="border border-gray-300 px-4 py-2">Rule Name</th>
                <th className="border border-gray-300 px-4 py-2">
                  Rule String
                </th>
                <th className="border border-gray-300 px-4 py-2">Actions</th>
                <th className="border border-gray-300 px-4 py-2">Rule ID</th>
              </tr>
            </thead>
            <tbody>
              {savedRules.map((rule) => (
                <tr key={rule._id}>
                  <td className="border border-gray-300 px-4 py-2 text-center">
                    <input
                      type="checkbox"
                      checked={selectedRules.includes(rule._id)}
                      onChange={() => handleSelectRule(rule._id)}
                    />
                  </td>
                  <td className="border border-gray-300 px-4 py-2">
                    {editingRuleId === rule._id ? (
                      <input
                        type="text"
                        value={editedName}
                        onChange={(e) => setEditedName(e.target.value)}
                        className="w-full rounded-md border-gray-300"
                      />
                    ) : (
                      rule.ruleName
                    )}
                  </td>
                  <td className="border border-gray-300 px-4 py-2">
                    {editingRuleId === rule._id ? (
                      <textarea
                        ref={textareaRef}
                        value={editedString}
                        onChange={(e) => {
                          setEditedString(e.target.value);
                          adjustTextareaHeight();
                        }}
                        onInput={adjustTextareaHeight}
                        className="w-full rounded-md border-gray-300 resize-none"
                      />
                    ) : (
                      <pre>{rule.ruleString}</pre>
                    )}
                  </td>
                  <td className="border border-gray-300 px-4 py-2">
                    {editingRuleId === rule._id ? (
                      <button
                        onClick={() => handleUpdate(rule._id)}
                        disabled={isUpdating}
                        className={`bg-green-500 text-white px-2 py-1 rounded-md hover:bg-green-600 ${
                          isUpdating ? "opacity-50 cursor-not-allowed" : ""
                        }`}
                      >
                        {isUpdating ? "Updating..." : "Update"}
                      </button>
                    ) : (
                      <button
                        onClick={() => handleEdit(rule)}
                        className="bg-blue-500 text-white px-2 py-1 rounded-md hover:bg-blue-600 mr-2"
                      >
                        Edit
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(rule._id)}
                      disabled={isDeleting === rule._id}
                      className={`bg-red-500 text-white px-2 py-1 rounded-md hover:bg-red-600 ${
                        isDeleting === rule._id
                          ? "opacity-50 cursor-not-allowed"
                          : ""
                      }`}
                    >
                      {isDeleting === rule._id ? "Deleting..." : "Delete"}
                    </button>
                  </td>
                  <td className="border border-gray-300 px-4 py-2">
                    {rule._id}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default RulesList;
