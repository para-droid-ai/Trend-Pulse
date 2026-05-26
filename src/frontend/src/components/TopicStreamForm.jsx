import React, { useState, useEffect } from "react";
import OrbitalLoadingAnimation from "./OrbitalLoadingAnimation";
import { optimizePromptAPI } from "../services/api";
import {
  systemPromptTemplates,
  updateFrequencyOptions,
  detailLevelOptions,
  modelTypeOptions,
  recencyFilterOptions,
  contextHistoryLevelOptions,
  detailExplanationMap,
  reasoningModels,
} from "../constants/formOptions";

const TopicStreamForm = ({
  onSubmit,
  initialData = null,
  isEditing = false,
  onCancel,
}) => {
  const [formData, setFormData] = useState({
    query: "",
    update_frequency: "daily",
    detail_level: "detailed",
    model_type: "sonar-reasoning",
    recency_filter: "1d",
    temperature: 0.7,
    system_prompt: "",
    context_history_level: "last_1",
    auto_update_enabled: true,
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitProgress, setSubmitProgress] = useState("");
  const [error, setError] = useState("");

  // Optimize prompt state
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizeError, setOptimizeError] = useState("");

  useEffect(() => {
    if (initialData) {
      console.log(
        "[TopicStreamForm] Received initialData.auto_update_enabled:",
        initialData.auto_update_enabled,
        "(type:",
        typeof initialData.auto_update_enabled + ")",
      );

      setFormData({
        query: initialData.query || "",
        update_frequency: initialData.update_frequency || "daily",
        detail_level: initialData.detail_level || "detailed",
        model_type: initialData.model_type || "sonar-reasoning",
        recency_filter: initialData.recency_filter || "1d",
        temperature:
          typeof initialData.temperature === "number"
            ? initialData.temperature
            : 0.7,
        system_prompt:
          typeof initialData.system_prompt === "string"
            ? initialData.system_prompt
            : "",
        context_history_level: initialData.context_history_level || "last_1",
        auto_update_enabled:
          initialData.auto_update_enabled !== undefined
            ? initialData.auto_update_enabled
            : true,
      });
    } else {
      setFormData({
        query: "",
        update_frequency: "daily",
        detail_level: "detailed",
        model_type: "sonar-reasoning",
        recency_filter: "1d",
        temperature: 0.7,
        system_prompt: "",
        context_history_level: "last_1",
        auto_update_enabled: true,
      });
    }
  }, [initialData]);

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    setFormData({
      ...formData,
      [name]: type === "range" ? parseFloat(value) : value,
    });

    // Clear error for this field when user edits it
    if (errors[name]) {
      setErrors({ ...errors, [name]: undefined });
    }
  };

  const validateForm = () => {
    const newErrors = {};

    // Query validation - required and minimum length
    if (!formData.query.trim()) {
      newErrors.query = "Query is required";
    } else if (formData.query.trim().length < 3) {
      newErrors.query = "Query must be at least 3 characters";
    }

    // Validate update frequency
    const validUpdateFrequencies = updateFrequencyOptions.map(
      (option) => option.value,
    );
    if (!validUpdateFrequencies.includes(formData.update_frequency)) {
      newErrors.update_frequency = "Please select a valid update frequency";
    }

    // Validate detail level
    const validDetailLevels = detailLevelOptions.map((option) => option.value);
    if (!validDetailLevels.includes(formData.detail_level)) {
      newErrors.detail_level = "Please select a valid detail level";
    }

    // Validate model type
    const validModelTypes = modelTypeOptions.map((option) => option.value);
    if (!validModelTypes.includes(formData.model_type)) {
      newErrors.model_type = "Please select a valid model type";
    }

    // Validate recency filter
    const validRecencyFilters = recencyFilterOptions.map(
      (option) => option.value,
    );
    if (!validRecencyFilters.includes(formData.recency_filter)) {
      newErrors.recency_filter = "Please select a valid recency filter";
    }

    // Validate temperature
    if (formData.temperature < 0 || formData.temperature > 1) {
      newErrors.temperature = "Temperature must be between 0 and 1";
    }

    // Inside validateForm()
    const validContextHistoryLevels = contextHistoryLevelOptions.map(
      (o) => o.value,
    );
    if (
      !formData.context_history_level ||
      !validContextHistoryLevels.includes(formData.context_history_level)
    ) {
      newErrors.context_history_level = "Please select a valid context depth.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Determine if the currently selected model is a reasoning model
  const isReasoningModel = reasoningModels.includes(formData.model_type);

  // Get the current explanation based on selected detail level and model type
  const currentDetailExplanation =
    detailExplanationMap[formData.detail_level] || {};

  // Get the correct token count based on whether it's a reasoning model
  const displayedTokens = isReasoningModel
    ? currentDetailExplanation.tokens?.reasoning
    : currentDetailExplanation.tokens?.non_reasoning;

  const handleOptimizePrompt = async () => {
    if (!formData.query.trim()) {
      setOptimizeError("Please enter a topic query before optimizing.");
      return;
    }

    setIsOptimizing(true);
    setOptimizeError("");

    try {
      const result = await optimizePromptAPI.optimize(formData.query);

      // Update the query field with the optimized version
      setFormData((prevFormData) => ({
        ...prevFormData,
        query: result.optimized_query,
      }));

      // Clear any existing query errors since we have new content
      if (errors.query) {
        setErrors((prevErrors) => ({ ...prevErrors, query: undefined }));
      }
    } catch (err) {
      console.error("Optimize prompt error:", err);
      setOptimizeError(
        err.message || "Failed to optimize prompt. Please try again.",
      );
    } finally {
      setIsOptimizing(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      // Apple-style progress feedback
      setSubmitProgress("Creating stream...");
      await new Promise((resolve) => setTimeout(resolve, 300)); // Brief pause for visual feedback

      setSubmitProgress("Initializing AI search...");
      await onSubmit(formData);

      setSubmitProgress("Stream created successfully!");
      await new Promise((resolve) => setTimeout(resolve, 500)); // Show success briefly
    } catch (err) {
      console.error("Form submission error:", err);
      setError(err.message || "Failed to create stream. Please try again.");
      setSubmitProgress("");
    } finally {
      setIsSubmitting(false);
      setSubmitProgress("");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-destructive/10 border border-destructive text-destructive px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div>
        <label
          htmlFor="query"
          className="block text-sm font-medium text-foreground"
        >
          Topic Query <span className="text-destructive">*</span>
        </label>
        <div className="mt-1">
          <textarea
            name="query"
            id="query"
            value={formData.query}
            onChange={handleChange}
            rows={3}
            className={`shadow-sm focus:ring-ring focus:border-border block w-full sm:text-sm border-border rounded-md resize-y ${
              errors.query ? "border-destructive" : ""
            } bg-background text-foreground placeholder-muted-foreground`}
            placeholder="Enter a topic query, e.g., 'latest AI developments'"
            data-testid="topic-query-input"
          />
          {errors.query && (
            <p className="mt-1 text-sm text-destructive">{errors.query}</p>
          )}
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          This query will be used to search for information on this topic.
        </p>

        {/* Optimize Prompt Button */}
        <div className="mt-3">
          <button
            type="button"
            onClick={handleOptimizePrompt}
            disabled={isOptimizing || isSubmitting || !formData.query.trim()}
            className={`inline-flex items-center space-x-2 px-4 py-2 border border-border rounded-lg shadow-sm text-sm font-medium text-foreground bg-background hover:bg-muted focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ring transition-all duration-200 ${
              isOptimizing || isSubmitting || !formData.query.trim()
                ? "opacity-50 cursor-not-allowed"
                : "hover:shadow-md hover:-translate-y-0.5 active:scale-95"
            }`}
          >
            {isOptimizing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-foreground border-t-transparent"></div>
                <span>Optimizing...</span>
              </>
            ) : (
              <>
                <svg
                  className="w-4 h-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M12 20h9" />
                  <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                  <path d="M8.5 5.5L18.5 15.5" />
                </svg>
                <span>Optimize Prompt</span>
              </>
            )}
          </button>

          {optimizeError && (
            <p className="mt-2 text-sm text-destructive">{optimizeError}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div>
          <label
            htmlFor="update_frequency"
            className="block text-sm font-medium text-foreground"
          >
            Update Frequency
          </label>
          <select
            id="update_frequency"
            name="update_frequency"
            value={formData.update_frequency}
            onChange={handleChange}
            className={`mt-1 block w-full pl-3 pr-10 py-2 text-base border-border focus:outline-none focus:ring-ring focus:border-border sm:text-sm rounded-md ${
              errors.update_frequency ? "border-destructive" : ""
            } bg-background text-foreground`}
            data-testid="update-frequency-select"
          >
            {updateFrequencyOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {errors.update_frequency && (
            <p className="mt-1 text-sm text-destructive">
              {errors.update_frequency}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="detail_level"
            className="block text-sm font-medium text-foreground"
          >
            Detail Level
          </label>
          <select
            id="detail_level"
            name="detail_level"
            value={formData.detail_level}
            onChange={handleChange}
            className={`mt-1 block w-full pl-3 pr-10 py-2 text-base border-border focus:outline-none focus:ring-ring focus:border-border sm:text-sm rounded-md ${
              errors.detail_level ? "border-destructive" : ""
            } bg-background text-foreground`}
            data-testid="detail-level-select"
          >
            {detailLevelOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {errors.detail_level && (
            <p className="mt-1 text-sm text-destructive">
              {errors.detail_level}
            </p>
          )}
          {/* Dynamically display active parameters */}
          <p className="mt-1 text-xs text-muted-foreground">
            Token Output: {displayedTokens}, Search Context:{" "}
            {currentDetailExplanation.context}
          </p>
        </div>

        <div>
          <label
            htmlFor="model_type"
            className="block text-sm font-medium text-foreground"
          >
            Model Type
          </label>
          <select
            id="model_type"
            name="model_type"
            value={formData.model_type}
            onChange={handleChange}
            className={`mt-1 block w-full pl-3 pr-10 py-2 text-base border-border focus:outline-none focus:ring-ring focus:border-border sm:text-sm rounded-md ${
              errors.model_type ? "border-destructive" : ""
            } bg-background text-foreground`}
            data-testid="model-type-select"
          >
            {modelTypeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {errors.model_type && (
            <p className="mt-1 text-sm text-destructive">{errors.model_type}</p>
          )}
        </div>

        <div>
          <label
            htmlFor="temperature"
            className="block text-sm font-medium text-foreground"
          >
            Temperature{" "}
            <span className="ml-2 text-xs text-muted-foreground">
              ({formData.temperature})
            </span>
          </label>
          <input
            type="range"
            id="temperature"
            name="temperature"
            min="0"
            max="1"
            step="0.01"
            value={formData.temperature}
            onChange={handleChange}
            className="w-full mt-1 accent-primary"
          />
          {errors.temperature && (
            <p className="mt-1 text-sm text-destructive">
              {errors.temperature}
            </p>
          )}
        </div>

        {/* Custom System Prompt Template Dropdown */}
        <div className="sm:col-span-2">
          <label
            htmlFor="prompt_template"
            className="block text-sm font-medium text-foreground"
          >
            System Prompt Template{" "}
            <span className="text-xs text-muted-foreground">(optional)</span>
          </label>
          <select
            id="prompt_template"
            name="prompt_template"
            value="" // This select is for action, not bound to formData directly
            onChange={(e) => {
              /* Handle template selection */
              const selectedTemplateName = e.target.value;
              if (selectedTemplateName) {
                const selectedTemplate = systemPromptTemplates.find(
                  (tpl) => tpl.name === selectedTemplateName,
                );
                if (selectedTemplate) {
                  // Append to existing system_prompt
                  setFormData((prevFormData) => ({
                    ...prevFormData,
                    system_prompt:
                      (prevFormData.system_prompt
                        ? prevFormData.system_prompt + "\n\n"
                        : "") + selectedTemplate.prompt,
                  }));
                }
              }
              e.target.value = ""; // Reset select value after selection
            }}
            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-border focus:outline-none focus:ring-ring focus:border-border sm:text-sm rounded-md bg-background text-foreground"
          >
            <option value="">Select a template</option>
            {systemPromptTemplates.map((template) => (
              <option key={template.name} value={template.name}>
                {template.name}
              </option>
            ))}
          </select>
        </div>

        {/* Custom System Prompt */}
        <div className="sm:col-span-2">
          <label
            htmlFor="system_prompt"
            className="block text-sm font-medium text-foreground"
          >
            Custom System Prompt{" "}
            <span className="text-xs text-muted-foreground">(optional)</span>
          </label>
          <textarea
            id="system_prompt"
            name="system_prompt"
            value={formData.system_prompt}
            onChange={handleChange}
            rows={3}
            className="mt-1 block w-full border border-border rounded-md shadow-sm focus:ring-ring focus:border-border sm:text-sm bg-background text-foreground placeholder-muted-foreground"
            placeholder="Enter a custom system prompt to override the default..."
          />
          <p className="mt-1 text-xs text-muted-foreground">
            If provided, this will replace the default system prompt for this
            stream.
          </p>
        </div>

        <div>
          <label
            htmlFor="recency_filter"
            className="block text-sm font-medium text-foreground"
          >
            Recency Filter
          </label>
          <select
            id="recency_filter"
            name="recency_filter"
            value={formData.recency_filter}
            onChange={handleChange}
            className={`mt-1 block w-full pl-3 pr-10 py-2 text-base border-border focus:outline-none focus:ring-ring focus:border-border sm:text-sm rounded-md ${
              errors.recency_filter ? "border-destructive" : ""
            } bg-background text-foreground`}
            data-testid="recency-filter-select"
          >
            {recencyFilterOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {errors.recency_filter && (
            <p className="mt-1 text-sm text-destructive">
              {errors.recency_filter}
            </p>
          )}
        </div>

        <div className="sm:col-span-1">
          <label
            htmlFor="context_history_level"
            className="block text-sm font-medium text-foreground"
          >
            Update Context Depth
          </label>
          <select
            id="context_history_level"
            name="context_history_level"
            value={formData.context_history_level}
            onChange={handleChange}
            className={`mt-1 block w-full pl-3 pr-10 py-2 text-base border-border focus:outline-none focus:ring-ring focus:border-border sm:text-sm rounded-md ${
              errors.context_history_level ? "border-destructive" : ""
            } bg-background text-foreground`}
            data-testid="context-history-level-select"
          >
            {contextHistoryLevelOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {errors.context_history_level && (
            <p className="mt-1 text-sm text-destructive">
              {errors.context_history_level}
            </p>
          )}
          <p className="mt-1 text-xs text-muted-foreground">
            How many past summaries to include for new updates.
          </p>
        </div>

        {/* Auto Update Enabled Checkbox */}
        <div className="sm:col-span-2 flex items-center pt-3">
          <input
            type="checkbox"
            name="auto_update_enabled"
            id="auto_update_enabled"
            checked={formData.auto_update_enabled}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                auto_update_enabled: e.target.checked,
              }))
            }
            className="h-4 w-4 text-primary focus:ring-ring border-border rounded accent-primary"
            data-testid="auto-update-checkbox"
          />
          <label
            htmlFor="auto_update_enabled"
            className="ml-2 block text-sm font-medium text-foreground"
          >
            Enable Automatic Updates
          </label>
        </div>
      </div>

      {/* Apple-style Progress Indicator */}
      {isSubmitting && (
        <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 animate-in slide-in-from-top-2 duration-300">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              <OrbitalLoadingAnimation size="small" variant="geometric" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-primary">
                {submitProgress}
              </p>
              <div className="mt-2 bg-primary/20 rounded-full h-1.5 overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full animate-pulse"
                  style={{ width: "100%" }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-3">
        <button
          type="submit"
          disabled={isSubmitting}
          className={`w-full flex justify-center items-center space-x-2 py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-primary-foreground bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ring transition-all duration-200 ${
            isSubmitting
              ? "opacity-75 cursor-not-allowed scale-[0.98]"
              : "hover:shadow-md hover:-translate-y-0.5 active:scale-95"
          }`}
          data-testid="create-stream-button"
        >
          <svg
            className="w-4 h-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            {isEditing ? (
              <path d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
            ) : (
              <path d="M12 5v14M5 12h14" />
            )}
          </svg>
          <span>
            {isSubmitting
              ? isEditing
                ? "Updating..."
                : "Creating..."
              : isEditing
                ? "Update Topic Stream"
                : "Create Topic Stream"}
          </span>
        </button>

        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="w-full flex justify-center py-2 px-4 border border-border rounded-lg shadow-sm text-sm font-medium text-foreground bg-background hover:bg-muted focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ring transition-all duration-200 disabled:opacity-50"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
};

export default TopicStreamForm;
