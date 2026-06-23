import React, { useState, useEffect, useCallback, useRef } from "react";
import { topicStreamAPI } from "../services/api";
import {
  parseISO as dateFnsParseISO,
  formatDistanceToNowStrict as dateFnsFormatDistanceToNowStrict,
  format as dateFnsFormat,
} from "date-fns";
import { enUS } from "date-fns/locale";
import DeepDiveChat from "./DeepDiveChat";
import MarkdownRenderer from "./MarkdownRenderer";
import SummaryDeleteButton from "./SummaryDeleteButton";
import TopicStreamForm from "./TopicStreamForm";
import Portal from "./Portal";
import MaskedSection from "./MaskedSection";
import { ArrowPathIcon } from "@heroicons/react/24/outline";
import { TagIcon } from "@heroicons/react/24/outline";

// Custom locale for abbreviated distance
const customDistanceLocale = {
  lessThanXSeconds: { one: "just now", other: "{{count}}s ago" },
  xSeconds: { one: "{{count}}s ago", other: "{{count}}s ago" },
  halfAMinute: "30s ago",
  lessThanXMinutes: { one: "1m ago", other: "{{count}}m ago" },
  xMinutes: { one: "{{count}}m ago", other: "{{count}}m ago" },
  aboutXHours: { one: "1h ago", other: "{{count}}h ago" },
  xHours: { one: "{{count}}h ago", other: "{{count}}h ago" },
  xDays: { one: "1d ago", other: "{{count}}d ago" },
  aboutXWeeks: { one: "1wk ago", other: "{{count}}wk ago" },
  xWeeks: { one: "{{count}}wk ago", other: "{{count}}wk ago" },
  aboutXMonths: { one: "1mo ago", other: "{{count}}mo ago" },
  xMonths: { one: "{{count}}mo ago", other: "{{count}}mo ago" },
  aboutXYears: { one: "1yr ago", other: "{{count}}yr ago" },
  xYears: { one: "{{count}}yr ago", other: "{{count}}yr ago" },
  overXYears: { one: "over 1yr ago", other: "over {{count}}yr ago" },
  almostXYears: { one: "almost 1yr ago", other: "almost {{count}}yr ago" },
};

function formatDistanceLocale(token, count, options) {
  options = options || {};
  const customStrObj = customDistanceLocale[token];
  let baseString;

  if (typeof customStrObj === "string") {
    baseString = customStrObj;
  } else {
    // For future dates (options.comparison > 0), prefer '.one' if it makes sense, else '.other'
    // For past dates, use '.other' for pluralization consistency, or '.one' if count is 1.
    // This logic might need refinement based on how date-fns calls this with 'count'.
    // Typically for distance functions, 'count' is the determining factor for one/other.
    baseString =
      count === 1 && customStrObj.one ? customStrObj.one : customStrObj.other;
  }

  let formattedString = baseString.replace("{{count}}", String(count));

  if (options.addSuffix) {
    if (options.comparison > 0) {
      // Date is in the future
      // Remove ' ago' or 'ago' if present and prepend 'in '
      formattedString = "in " + formattedString.replace(/\s*ago$/i, "").trim();
    } else {
      // Date is in the past
      // Ensure 'ago' is present if not already (most custom strings have it)
      if (
        !formattedString.toLowerCase().endsWith("ago") &&
        formattedString !== "just now"
      ) {
        formattedString += " ago";
      }
    }
  }
  return formattedString;
}

const localeWithAbbreviation = {
  formatDistance: formatDistanceLocale,
  // Include other locale properties if needed, but formatDistance is key
  localize: {}, // Assuming we don't need custom localization strings for now
  match: {}, // Assuming we don't need custom matching for now
  options: {},
};

const estTimeZone = "America/New_York";

// Helper function to parse backend date string to a UTC Date object
const parseBackendDateToUTCDate = (dateString) => {
  if (!dateString) return null;
  try {
    let isoCompliantString = dateString.includes("T")
      ? dateString
      : dateString.replace(" ", "T");
    // Ensure the string is treated as UTC by appending 'Z' if no offset/Z is present
    if (
      !isoCompliantString.endsWith("Z") &&
      !isoCompliantString.match(/[+-]\\d{2}:\\d{2}$/)
    ) {
      isoCompliantString += "Z";
    }

    let parsedDate = dateFnsParseISO(isoCompliantString);
    if (parsedDate && !isNaN(parsedDate.getTime())) {
      return parsedDate;
    }

    // Fallback to new Date() only if dateFnsParseISO fails
    parsedDate = new Date(isoCompliantString); // new Date() also treats 'Z' as UTC
    if (parsedDate && !isNaN(parsedDate.getTime())) {
      return parsedDate;
    }

    // Ultimate fallback: try original date string transformed, as a last resort
    // This case handles if isoCompliantString was already modified in a way that made it unparsable by the first two attempts
    let originalAsIsoWithZ = dateString.includes("T")
      ? dateString
      : dateString.replace(" ", "T");
    if (
      !originalAsIsoWithZ.endsWith("Z") &&
      !originalAsIsoWithZ.match(/[+-]\\d{2}:\\d{2}$/)
    ) {
      originalAsIsoWithZ += "Z";
    }

    if (isoCompliantString !== originalAsIsoWithZ) {
      // Only try this if it's a different string than already attempted
      parsedDate = new Date(originalAsIsoWithZ);
      if (parsedDate && !isNaN(parsedDate.getTime())) {
        return parsedDate;
      }
    }

    return null;
  } catch (error) {
    return null;
  }
};

// Helper to get a formatted string directly for EST without using date-fns-tz
const formatToEstString = (dateString) => {
  if (!dateString) return "";

  const dateObj = parseBackendDateToUTCDate(dateString);

  if (!dateObj || !(dateObj instanceof Date) || isNaN(dateObj.getTime())) {
    return "Invalid Date";
  }

  try {
    // Use the date directly without timezone adjustment
    const estDate = new Date(dateObj.getTime());

    // Use date-fns format (not date-fns-tz) to format the date
    // We're letting the browser handle the timezone display based on local settings
    const formatted = dateFnsFormat(estDate, "MMM d, yyyy h:mm a", {
      locale: enUS,
    });

    return formatted;
  } catch (error) {
    try {
      // Super simple fallback using just JavaScript built-ins
      const estDate = new Date(dateObj.getTime()); // Use date without timezone adjustment

      // Format date manually using JS Date methods
      const months = [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
      ];
      const month = months[estDate.getMonth()];
      const day = estDate.getDate();
      const year = estDate.getFullYear();
      let hours = estDate.getHours();
      const minutes = estDate.getMinutes().toString().padStart(2, "0");
      const ampm = hours >= 12 ? "pm" : "am";
      hours = hours % 12 || 12; // Convert to 12-hour format

      const fallbackFormatted = `${month} ${day}, ${year} ${hours}:${minutes} ${ampm}`;

      return fallbackFormatted;
    } catch (fallbackError) {
      return "Formatting Error";
    }
  }
};

const TopicStreamWidget = ({
  stream,
  onDelete,
  onUpdate,
  isGridView,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
  isDraggedOver,
  isDragging,
  isNewlyCreated = false,
  isSelected = false,
}) => {
  const [summaries, setSummaries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isVisible, setIsVisible] = useState(false);
  const widgetRef = useRef(null);
  const [showDeepDive, setShowDeepDive] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [selectedSummary, setSelectedSummary] = useState(null);
  const [showEditForm, setShowEditForm] = useState(false);
  const [showExportOptions, setShowExportOptions] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState("");
  const [showDeleteStreamConfirm, setShowDeleteStreamConfirm] = useState(false);

  const fetchSummaries = useCallback(async () => {
    if (!isVisible) return;

    try {
      setLoading(true);
      setError("");
      const data = await topicStreamAPI.getSummaries(stream.id);
      const summariesWithModel = data.map((summary) => ({
        ...summary,
        model_type: stream.model_type,
      }));
      setSummaries(summariesWithModel);
    } catch (err) {
      setError("Failed to load summaries. Please try refreshing.");
    } finally {
      setLoading(false);
    }
  }, [stream.id, stream.model_type, isVisible]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          // observer.unobserve(entry.target); // Optional: Unobserve after first visibility
        }
      },
      {
        rootMargin: "0px",
        threshold: 0.1,
      },
    );

    if (widgetRef.current) {
      observer.observe(widgetRef.current);
    }

    return () => {
      if (widgetRef.current) {
        // eslint-disable-next-line react-hooks/exhaustive-deps
        observer.unobserve(widgetRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (isVisible) {
      fetchSummaries();
    }
  }, [isVisible, fetchSummaries]);

  const handleUpdateNow = async () => {
    try {
      setUpdating(true);
      setError("");

      const newSummary = await topicStreamAPI.updateNow(stream.id);

      if (
        newSummary.content &&
        newSummary.content.includes("No new information is available")
      ) {
        setError("No new information is available since the last update.");
      } else {
        setSummaries((prevSummaries) => [newSummary, ...prevSummaries]);
      }
    } catch (err) {
      setError(err.message || "Failed to update stream. Please try again.");
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteStream = () => {
    setShowDeleteStreamConfirm(true);
  };

  const confirmDeleteStream = () => {
    if (onDelete && typeof onDelete === "function") {
      onDelete(stream.id);
    }
    setShowDeleteStreamConfirm(false);
  };

  const cancelDeleteStream = () => {
    setShowDeleteStreamConfirm(false);
  };

  const handleSummarySuccessfullyDeleted = (deletedSummaryId) => {
    setSummaries((prevSummaries) => {
      const newSummaries = prevSummaries.filter(
        (s) => s.id !== deletedSummaryId,
      );

      return newSummaries;
    });
    setError("");
  };

  const handleSummaryDeletionError = (errorMessage) => {
    setError(errorMessage);
  };

  const handleAppendSummary = (newSummary) => {
    setSummaries((prevSummaries) => [newSummary, ...prevSummaries]);
  };

  const handleDeepDive = (summary) => {
    setSelectedSummary(summary);
    setShowDeepDive(true);
  };

  const handleEdit = () => {
    setShowEditForm(true);
  };

  const handleEditSubmit = async (formData) => {
    try {
      await onUpdate(stream.id, formData);
      setShowEditForm(false);
      setError("");
    } catch (err) {
      setError(err.message || "Failed to update stream. Please try again.");
    }
  };

  // Function to format stream content for export
  const formatStreamContent = (
    streamData,
    summariesData,
    formatType = "md",
  ) => {
    let content = ``;
    // For export, still use the manual formatting logic for consistency
    const exportFormatDate = (dateString) => {
      if (!dateString) return "";
      const dateObj = parseBackendDateToUTCDate(dateString);
      if (!dateObj || !(dateObj instanceof Date) || isNaN(dateObj.getTime())) {
        return "Invalid Date";
      }

      try {
        // Use the date directly without timezone adjustment
        const estDate = new Date(dateObj.getTime());

        // Format date parts using date-fns (not date-fns-tz)
        const formattedDatePart = dateFnsFormat(estDate, "MMM d, yyyy", {
          locale: enUS,
        });
        const hour24 = estDate.getHours();
        const minute = estDate.getMinutes();
        const hour12 = hour24 % 12 || 12;
        const ampm = hour24 < 12 || hour24 === 24 ? "am" : "pm";
        const formattedMinute = String(minute).padStart(2, "0");

        return `${formattedDatePart} ${hour12}:${formattedMinute} ${ampm}`;
      } catch (error) {
        // Fallback within export if primary formatting fails
        try {
          return dateFnsFormat(dateObj, "MMM d, yyyy HH:mm ''EST''", {
            locale: enUS,
          }); // Simpler fallback, escaped EST
        } catch (e) {
          return "Invalid Date (Export Fallback)";
        }
      }
    };

    if (formatType === "md") {
      content += `# ${streamData.query}\n\n`;
      content += `*Update Frequency:* ${streamData.update_frequency}\n`;
      content += `*Detail Level:* ${streamData.detail_level}\n`;
      if (streamData.last_updated) {
        const lastUpdatedFormatted = exportFormatDate(streamData.last_updated);
        content += `*Last Updated:* ${lastUpdatedFormatted}\n`;
      }
      content += `\n---\n\n`;

      summariesData.forEach((summary, index) => {
        const createdAtFormatted = exportFormatDate(summary.created_at);
        content += `## Summary ${summariesData.length - index}\n\n`;
        content += `*Generated:* ${createdAtFormatted}\n`;
        if (summary.model) {
          content += `*Model:* ${summary.model}\n`;
        }
        content += `\n${summary.content}\n\n`;

        if (summary.sources && summary.sources.length > 0) {
          content += `*Sources:*\n`;
          summary.sources.forEach((source) => {
            // Handle potential source objects or strings
            const sourceUrl =
              typeof source === "string"
                ? source
                : source.url || source.name || source;
            if (sourceUrl) {
              content += `- [${sourceUrl}](${sourceUrl})\n`;
            }
          });
          content += `\n`;
        }
        // Removed the extra separator inside the loop
        content += `\n---\n\n`;
      });
    } else {
      // txt format
      content += `${streamData.query}\n\n`;
      content += `Update Frequency: ${streamData.update_frequency}\n`;
      content += `Detail Level: ${streamData.detail_level}\n`;
      if (streamData.last_updated) {
        const lastUpdatedFormatted = exportFormatDate(streamData.last_updated);
        content += `*Last Updated:* ${lastUpdatedFormatted}\n`;
      }
      content += `\n---\n\n`;

      summariesData.forEach((summary, index) => {
        const createdAtFormatted = exportFormatDate(summary.created_at);
        content += `Summary ${summariesData.length - index}\n\n`;
        content += `*Generated:* ${createdAtFormatted}\n`;
        if (summary.model) {
          content += `Model: ${summary.model}\n`;
        }
        content += `\n${summary.content}\n\n`;

        if (summary.sources && summary.sources.length > 0) {
          content += `Sources:\n`;
          summary.sources.forEach((source) => {
            const sourceUrl =
              typeof source === "string"
                ? source
                : source.url || source.name || source;
            if (sourceUrl) {
              // Ensure sourceUrl is not empty
              content += `- ${sourceUrl}\n`;
            }
          });
          content += `\n`;
        }
        content += `\n---\n\n`;
      });
    }

    return content;
  };

  // Function to copy content to clipboard
  const copyToClipboard = async () => {
    const content = formatStreamContent(stream, summaries, "txt"); // Use txt format for clipboard
    try {
      await navigator.clipboard.writeText(content);
      setCopyFeedback("Copied!");
    } catch (err) {
      setCopyFeedback("Failed to copy.");
    } finally {
      setTimeout(() => setCopyFeedback(""), 3000);
    }
  };

  // Function to export content as a file
  const exportAsFile = (formatType) => {
    try {
      const content = formatStreamContent(stream, summaries, formatType);

      const blob = new Blob([content], {
        type:
          formatType === "md"
            ? "text/markdown;charset=utf-8"
            : "text/plain;charset=utf-8",
      });

      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      // Improve filename sanitization and provide a fallback
      const sanitizedQuery = (stream.query || "untitled_stream")
        .replace(/[\s\\\\/:*?"<>|]+/g, "_")
        .substring(0, 50);
      const filename = `${sanitizedQuery}.${formatType}`;

      a.href = url;
      a.download = filename;

      document.body.appendChild(a);
      a.click();

      // Add a small setTimeout (e.g., 100ms) before revoking the object URL and removing the temporary anchor element.
      setTimeout(() => {
        if (document.body.contains(a)) {
          // Check if element still exists
          document.body.removeChild(a);
        } else {
        }
        URL.revokeObjectURL(url); // Clean up the object URL
      }, 100); // 100ms delay
    } catch (err) {
      setCopyFeedback(`Export failed: ${err.message || "Unknown error"}`); // Or use a new state
      setTimeout(() => setCopyFeedback(""), 3000);
    }
  };

  if (!stream || !stream.id) {
    return null;
  }

  return (
    <div
      ref={widgetRef}
      onDragEnd={onDragEnd}
      onDragOver={(e) => onDragOver(e, stream.id)}
      onDrop={(e) => onDrop(e, stream.id)}
      className={`${
        isGridView ? "lg:col-span-1" : "w-full"
      } bg-card border border-border rounded-xl shadow-sm transition-all duration-300 hover:shadow-md
       ${isDraggedOver ? "border-primary bg-primary/5" : ""}
       ${isDragging ? "opacity-50" : ""}
       ${isNewlyCreated ? "new-stream-highlight" : ""}
       ${isSelected ? "selected-stream" : ""}`}
      style={{ zIndex: 60 }}
    >
      {showEditForm ? (
        <div
          className="p-6 bg-card animate-in slide-in-from-top-2 duration-300 w-full overflow-hidden"
          style={{ zIndex: 50 }}
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-foreground">
              Edit Topic Stream
            </h3>
            <div className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
              ID: {stream.id}
            </div>
          </div>
          <TopicStreamForm
            initialData={stream}
            onSubmit={handleEditSubmit}
            onCancel={() => setShowEditForm(false)}
            isEditing={true}
          />
        </div>
      ) : (
        <div className="w-full overflow-hidden">
          <div className="p-6 pb-4 border-b border-border/50 w-full">
            <div className="flex items-start justify-between w-full">
              <div className="flex-1 min-w-0 overflow-hidden">
                <h3
                  draggable={!isGridView}
                  onDragStart={(e) => {
                    if (!isGridView && onDragStart) {
                      onDragStart(e, stream.id);
                    }
                  }}
                  className="text-lg font-semibold text-foreground leading-tight mb-2 group-hover:text-primary transition-colors truncate cursor-grab"
                  title={`${stream.query} (Drag to reorder)`}
                >
                  {stream.query}
                </h3>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground overflow-hidden whitespace-nowrap w-full mt-1">
                  <div
                    className="flex items-center space-x-1"
                    title={`Update frequency: ${stream.update_frequency}`}
                  >
                    <svg
                      className="w-3.5 h-3.5"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <circle cx="12" cy="12" r="3" />
                      <path d="M12 1v6M12 17v6M5.64 5.64l4.24 4.24M14.12 14.12l4.24 4.24M1 12h6M17 12h6M5.64 18.36l4.24-4.24M14.12 9.88l4.24-4.24" />
                    </svg>
                    {isGridView ? null : (
                      <span className="capitalize truncate">
                        {stream.update_frequency}
                      </span>
                    )}
                  </div>
                  <div
                    className="flex items-center space-x-1"
                    title={`Detail level: ${stream.detail_level}`}
                  >
                    <svg
                      className="w-3.5 h-3.5"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14,2 14,8 20,8" />
                    </svg>
                    {isGridView ? null : (
                      <span className="capitalize truncate">
                        {stream.detail_level}
                      </span>
                    )}
                  </div>
                  <div
                    className="flex items-center space-x-1"
                    title={`Last summary: ${stream.last_updated ? dateFnsFormatDistanceToNowStrict(parseBackendDateToUTCDate(stream.last_updated) || new Date(), { addSuffix: true, locale: localeWithAbbreviation }) : "Never"}`}
                  >
                    <svg
                      className="w-3.5 h-3.5"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="12,6 12,12 16,14" />
                    </svg>
                    <span className="truncate">
                      {stream.last_updated
                        ? dateFnsFormatDistanceToNowStrict(
                            parseBackendDateToUTCDate(stream.last_updated) ||
                              new Date(),
                            { addSuffix: true, locale: localeWithAbbreviation },
                          )
                        : "Never"}
                    </span>
                  </div>
                  {stream.total_stored_est_tokens !== null &&
                    stream.total_stored_est_tokens !== undefined && (
                      <div
                        className={`flex items-center space-x-1 px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-xs font-medium ${isGridView ? "" : ""}`}
                        title={`Estimated total stream tokens: ${stream.total_stored_est_tokens.toLocaleString()}`}
                      >
                        <TagIcon className="w-3 h-3 flex-shrink-0" />
                        {isGridView ? (
                          <span className="truncate">{`${(stream.total_stored_est_tokens / 1000).toFixed(1)}k`}</span>
                        ) : (
                          <span className="truncate">
                            Stream Tokens:{" "}
                            {stream.total_stored_est_tokens.toLocaleString()}
                          </span>
                        )}
                      </div>
                    )}
                </div>
              </div>

              <div className="flex items-center space-x-2 flex-shrink-0">
                <button
                  onClick={(e) => {
                    e.stopPropagation(); // Prevent card click
                    handleUpdateNow(stream.id);
                  }}
                  disabled={updating}
                  className="p-2 rounded-full hover:bg-accent hover:text-white dark:hover:text-white transition-colors group relative"
                  title="Refresh Now"
                >
                  {updating ? (
                    <svg
                      className="animate-spin h-5 w-5 text-foreground"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                  ) : (
                    <ArrowPathIcon className="w-5 h-5 text-foreground group-hover:text-white dark:group-hover:text-white" />
                  )}
                </button>

                <button
                  onClick={handleEdit}
                  className="p-2 rounded-lg text-muted-foreground hover:text-white dark:hover:text-white hover:bg-accent hover:scale-105 active:scale-95 transition-all duration-200 group"
                  title="Edit Stream"
                >
                  <svg
                    className="w-4 h-4 group-hover:text-white dark:group-hover:text-white"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M12 20h9" />
                    <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                  </svg>
                </button>

                <div className="relative z-50">
                  <button
                    onClick={() => setShowExportOptions(!showExportOptions)}
                    className="p-2 rounded-lg text-muted-foreground hover:text-white dark:hover:text-white hover:bg-accent hover:scale-105 active:scale-95 transition-all duration-200 group"
                    title="Export Options"
                  >
                    <svg
                      className="w-4 h-4 group-hover:text-white dark:group-hover:text-white"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="7,10 12,15 17,10" />
                      <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                  </button>

                  {showExportOptions && (
                    <div className="absolute right-0 top-full mt-2 w-48 bg-card border border-border rounded-lg shadow-lg z-100 animate-in slide-in-from-top-2 duration-200">
                      <div className="p-2">
                        <button
                          onClick={copyToClipboard}
                          className="w-full flex items-center space-x-2 px-3 py-2 text-sm rounded-md hover:bg-accent transition-colors"
                        >
                          <svg
                            className="w-4 h-4"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <rect
                              x="9"
                              y="9"
                              width="13"
                              height="13"
                              rx="2"
                              ry="2"
                            />
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                          </svg>
                          <span>Copy to Clipboard</span>
                        </button>
                        <button
                          onClick={() => exportAsFile("md")}
                          className="w-full flex items-center space-x-2 px-3 py-2 text-sm rounded-md hover:bg-accent transition-colors"
                        >
                          <svg
                            className="w-4 h-4"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                            <polyline points="14,2 14,8 20,8" />
                          </svg>
                          <span>Export as .md</span>
                        </button>
                        <button
                          onClick={() => exportAsFile("txt")}
                          className="w-full flex items-center space-x-2 px-3 py-2 text-sm rounded-md hover:bg-accent transition-colors"
                        >
                          <svg
                            className="w-4 h-4"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                            <polyline points="14,2 14,8 20,8" />
                          </svg>
                          <span>Export as .txt</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="relative">
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();

                      handleDeleteStream();
                    }}
                    className="p-2 rounded-lg text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/30 hover:scale-110 active:scale-95 transition-all duration-200 border-2 border-red-300 dark:border-red-700 bg-red-50/50 dark:bg-red-900/10"
                    title="🗑️ DELETE ENTIRE STREAM (All summaries will be lost!)"
                    type="button"
                    disabled={false}
                  >
                    <svg
                      className="w-5 h-5"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                    >
                      <circle cx="12" cy="12" r="10" />
                      <path d="M15 9l-6 6M9 9l6 6" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            {copyFeedback && (
              <Portal>
                <div
                  className="fixed bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
                  style={{
                    position: "fixed",
                    top: "0",
                    left: "0",
                    width: "100vw",
                    height: "100vh",
                    zIndex: 9999,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    pointerEvents: "none",
                  }}
                >
                  <div
                    className="bg-foreground text-background text-sm rounded shadow-lg animate-in slide-in-from-bottom-2 duration-200"
                    style={{
                      position: "relative",
                      padding: "0.75rem 1rem",
                      pointerEvents: "auto",
                    }}
                  >
                    {copyFeedback}
                  </div>
                </div>
              </Portal>
            )}
          </div>

          {error && !showDeleteStreamConfirm && (
            <div className="p-4 bg-destructive/10 border-l-4 border-destructive text-destructive">
              <p>{error}</p>
              <button
                onClick={() => setError("")}
                className="text-sm underline mt-1 text-destructive-foreground hover:text-destructive/80"
              >
                Dismiss
              </button>
            </div>
          )}

          <div className="divide-y divide-border w-full overflow-hidden">
            {isVisible && loading && (
              <div className="p-4 text-center text-muted-foreground">
                Loading summaries...
              </div>
            )}
            {!loading && summaries.length === 0 && isVisible && !error && (
              <div className="p-4 text-center text-muted-foreground">
                No summaries yet. Click "Update Now" to generate one.
              </div>
            )}
            {!isVisible && summaries.length === 0 && !loading && (
              <div className="p-4 text-center text-muted-foreground">
                Scroll to load summaries...
              </div>
            )}
            {summaries.map((summary) => {
              // Removed the second argument from formatToEstString call
              const displayCreatedAt = formatToEstString(summary.created_at);

              return (
                <div key={summary.id} className="p-2 w-full overflow-hidden">
                  <h4 className="text-md font-medium text-foreground mb-2 w-full overflow-hidden">
                    Summary
                  </h4>
                  <div className="flex flex-wrap gap-2 items-center mb-2 w-full overflow-hidden">
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-muted text-foreground dark:text-white font-medium">
                      {displayCreatedAt}
                    </span>
                    {summary.model && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-white bg-[#6495ed] dark:text-white dark:bg-[#4a6cbf]">
                        {summary.model}
                      </span>
                    )}

                    <div className="flex space-x-2 items-center ml-auto pr-1">
                      <button
                        onClick={() => handleDeepDive(summary)}
                        className="text-xs p-1 rounded-md text-white bg-[#2ccebb] hover:opacity-90 transition-colors"
                        title="Deep Dive Chat"
                      >
                        <img
                          src="/deepdivechat.svg"
                          alt="Deep Dive Chat"
                          className="h-6 w-6"
                        />
                      </button>
                      <SummaryDeleteButton
                        streamId={stream.id}
                        summaryId={summary.id}
                        onSummaryDeleted={handleSummarySuccessfullyDeleted}
                        onError={handleSummaryDeletionError}
                        isIconOnly={true}
                      />
                    </div>
                  </div>
                  <div className="px-2 py-1">
                    {summary.thoughts && (
                      <div className="not-prose my-4">
                        <MaskedSection label="Thoughts (experimental)">
                          {summary.thoughts}
                        </MaskedSection>
                      </div>
                    )}
                    <div className="prose prose-sm dark:prose-invert px-2">
                      <MarkdownRenderer
                        content={summary.content || ""}
                        sources={summary.sources}
                      />
                    </div>
                  </div>

                  {summary.sources && summary.sources.length > 0 && (
                    <div className="px-2 pb-2 w-full overflow-hidden">
                      <div className="text-xs font-medium text-muted-foreground mb-1 w-full">
                        Sources:
                      </div>
                      <div className="flex flex-wrap gap-1 w-full overflow-hidden">
                        {summary.sources.map((source, index) => (
                          <a
                            key={index}
                            href={
                              typeof source === "string"
                                ? source
                                : source.url || source.name || source
                            }
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-foreground dark:text-white bg-muted hover:bg-muted/80 px-2 py-1 rounded-full truncate max-w-[200px]"
                            title={
                              typeof source === "string"
                                ? source
                                : source.url || source
                            }
                          >
                            {typeof source === "string"
                              ? source
                              : source.name || source.url || source}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {(summary.prompt_tokens !== null ||
                    summary.completion_tokens !== null ||
                    summary.total_tokens !== null ||
                    summary.estimated_content_tokens !== null) && (
                    <div className="mt-2 pt-2 border-t border-border/50 px-2 text-xs text-muted-foreground w-full overflow-hidden">
                      {(summary.prompt_tokens !== null ||
                        summary.completion_tokens !== null ||
                        summary.total_tokens !== null) && (
                        <div className="flex flex-wrap items-center gap-x-2 w-full overflow-hidden">
                          <span className="font-semibold text-foreground dark:text-white">
                            API Usage:
                          </span>

                          {summary.prompt_tokens !== null && (
                            <span title="Tokens in the prompt sent to the API (includes query, system prompt, and previous context if any)">
                              Input: {summary.prompt_tokens}
                            </span>
                          )}

                          {summary.completion_tokens !== null && (
                            <>
                              {summary.prompt_tokens !== null && (
                                <span className="text-muted-foreground/60 mx-1">
                                  |
                                </span>
                              )}
                              <span title="Tokens generated by the AI model as the response content">
                                Output: {summary.completion_tokens}
                              </span>
                            </>
                          )}

                          {summary.total_tokens !== null && (
                            <>
                              {(summary.prompt_tokens !== null ||
                                summary.completion_tokens !== null) && (
                                <span className="text-muted-foreground/60 mx-1">
                                  |
                                </span>
                              )}
                              <span title="Total tokens processed by the API for this call (prompt + completion)">
                                Total: {summary.total_tokens} tokens
                              </span>
                            </>
                          )}
                        </div>
                      )}

                      {summary.estimated_content_tokens !== null && (
                        <div
                          className={`${summary.prompt_tokens !== null || summary.completion_tokens !== null || summary.total_tokens !== null ? "mt-0.5" : ""}`}
                        >
                          <span className="text-foreground dark:text-white">
                            (Content Est: ~{summary.estimated_content_tokens}{" "}
                            tokens)
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {showDeepDive && selectedSummary && (
            <Portal>
              <div
                className="fixed bg-background/75"
                style={{
                  position: "fixed",
                  top: "0",
                  left: "0",
                  width: "100vw",
                  height: "100vh",
                  zIndex: 9999,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "1rem",
                }}
              >
                <div
                  className="bg-card rounded-lg shadow-xl overflow-hidden flex flex-col"
                  style={{
                    position: "relative",
                    width: "100%",
                    height: "90vh",
                    maxWidth: "100rem",
                    margin: "0",
                  }}
                >
                  <div className="p-4 border-b border-border flex justify-between items-center">
                    <h3 className="text-lg font-medium text-foreground truncate flex-1 min-w-0">
                      Deep Dive: {stream.query}
                    </h3>
                    <button
                      onClick={() => setShowDeepDive(false)}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <svg
                        className="h-6 w-6"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M18 6L6 18M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  <div className="flex flex-1 overflow-hidden flex-row">
                    <div className="flex-1 basis-1/2 p-4 border-r border-border overflow-y-auto">
                      <h4 className="text-md font-medium text-foreground mb-2">
                        Original Summary
                      </h4>
                      <div className="text-sm text-muted-foreground mb-2">
                        {selectedSummary.created_at
                          ? formatToEstString(selectedSummary.created_at)
                          : ""}{" "}
                        • Model: {selectedSummary.model_type}
                      </div>
                      <MarkdownRenderer content={selectedSummary.content} />
                    </div>

                    <div className="flex-1 basis-1/2 overflow-hidden">
                      <DeepDiveChat
                        topicStreamId={stream.id}
                        summaryId={selectedSummary.id}
                        topic={stream.query}
                        onAppend={handleAppendSummary}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </Portal>
          )}

          {showDeleteStreamConfirm && (
            <Portal>
              <div
                className="fixed inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
                style={{
                  position: "fixed",
                  top: "0",
                  left: "0",
                  width: "100vw",
                  height: "100vh",
                  zIndex: 9999,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "1rem",
                }}
                onClick={cancelDeleteStream}
              >
                <div
                  className="bg-card rounded-lg p-6 shadow-xl"
                  style={{
                    position: "relative",
                    width: "100%",
                    maxWidth: "32rem",
                    maxHeight: "90vh",
                    margin: "0",
                    overflow: "auto",
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <h3
                    className="text-lg font-medium text-foreground mb-4"
                    style={{
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      display: "block",
                    }}
                    title={stream.query}
                  >
                    Delete Topic Stream: {stream.query}
                  </h3>
                  <p className="text-muted-foreground mb-6">
                    Are you sure you want to delete this topic stream? This
                    action cannot be undone, and all associated summaries will
                    be permanently deleted.
                  </p>
                  <div className="flex justify-end space-x-3">
                    <button
                      onClick={cancelDeleteStream}
                      className="px-4 py-2 text-sm font-medium text-foreground bg-muted rounded-md hover:bg-muted/80"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={confirmDeleteStream}
                      className="px-4 py-2 text-sm font-medium text-destructive-foreground bg-destructive rounded-md hover:bg-destructive/90"
                    >
                      Delete Stream
                    </button>
                  </div>
                </div>
              </div>
            </Portal>
          )}
        </div>
      )}
    </div>
  );
};

export default React.memo(TopicStreamWidget);
