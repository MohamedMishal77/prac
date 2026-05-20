import React, { useEffect, useMemo, useRef, useState } from "react";
import "./ContractForm.css";

// ─── Constants ────────────────────────────────────────────────────────────────

const EMPTY_FORM = {
  customerId: "",
  poNumber: "",
  contactPerson: "",
  contactEmail: "",
  termCode: "",
  currencyType: "",
  paymentMethod: "",
  numberOfUsers: "",
  cpiApplicable: "no",
  cpiNoticePeriod: "",
  cpiCapApplicable: "no",
  cpiCapPercentage: "",
  invoiceCycle: "",
  subscriptionAmount: "",
  totalEstimatedContractValue: "",
  contractStartDate: "",
  contractEndDate: "",
  serviceTypeIds: [],
  status: "active",
};

const INVOICE_CYCLE_OPTIONS = [
  { label: "Monthly", value: "monthly", months: 1 },
  { label: "Quarterly", value: "quarterly", months: 3 },
  { label: "Half-Yearly", value: "half-yearly", months: 6 },
  { label: "Annual", value: "annual", months: 12 },
];

const REQUIRED_FIELDS = [
  "customerId",
  "contactPerson",
  "contactEmail",
  "currencyType",
  "cpiApplicable",
  "invoiceCycle",
  "subscriptionAmount",
  "totalEstimatedContractValue",
  "contractStartDate",
  "contractEndDate",
];

// ─── Date Utilities ────────────────────────────────────────────────────────────

function parseDate(value) {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDateISO(date) {
  if (!date || Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function formatDateDisplay(isoStr) {
  if (!isoStr) return "";
  const [y, m, d] = isoStr.split("-");
  if (!y || !m || !d) return isoStr;
  return `${d}/${m}/${y}`;
}

function addMonthsSafe(date, months) {
  const next = new Date(date);
  const day = next.getDate();
  next.setMonth(next.getMonth() + months);
  if (next.getDate() < day) next.setDate(0);
  return next;
}

function subtractDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() - days);
  return next;
}

function getCycleMonths(cycle) {
  return INVOICE_CYCLE_OPTIONS.find((o) => o.value === cycle)?.months || 0;
}

// ─── Billing Schedule Builder ──────────────────────────────────────────────────

function buildBillingSchedule({ startDate, endDate, invoiceCycle, subscriptionAmount, cpiApplicable, cpiNoticePeriod }) {
  const start = parseDate(startDate);
  const end = parseDate(endDate);
  const baseAmount = Number(subscriptionAmount);

  if (!start || !end || start > end || !invoiceCycle || !(baseAmount > 0)) return [];

  const cycleMonths = getCycleMonths(invoiceCycle);
  if (!cycleMonths) return [];

  const rows = [];
  let currentStart = new Date(start);
  let rowIndex = 1;

  while (currentStart <= end && rowIndex < 1000) {
    const nextStart = addMonthsSafe(currentStart, cycleMonths);
    let currentEnd = subtractDays(nextStart, 1);
    if (currentEnd > end) currentEnd = new Date(end);

    const startISO = formatDateISO(currentStart);
    const endISO = formatDateISO(currentEnd);

    rows.push({
      id: `${rowIndex}-${startISO}-${endISO}`,
      scheduleNo: rowIndex,
      invoiceStartDate: startISO,
      invoiceEndDate: endISO,
      invoiceAmount: baseAmount,
      cpiApplicable: false,
      cpiNoticeDate: "",
      invoiceGenerated: false,
    });

    currentStart = new Date(nextStart);
    rowIndex += 1;
  }

  return rows;
}

function mergeScheduleRows(prevRows, nextRows, globalAmount) {
  const prevMap = new Map(prevRows.map((row) => [row.scheduleNo, row]));

  return nextRows.map((row) => {
    const prev = prevMap.get(row.scheduleNo);
    if (!prev) return row;

    // If the row's previous amount equals the previous global amount, update it
    // (i.e., don't override manually-edited amounts when they differ from global)
    return {
      ...row,
      invoiceAmount: prev.invoiceAmount ?? row.invoiceAmount,
      cpiApplicable: prev.cpiApplicable ?? false,
      invoiceGenerated: prev.invoiceGenerated ?? false,
    };
  });
}

function recalcCpiNoticeDates(rows, cpiNoticePeriod) {
  return rows.map((row) => ({
    ...row,
    cpiNoticeDate:
      row.cpiApplicable && cpiNoticePeriod
        ? formatDateISO(subtractDays(parseDate(row.invoiceStartDate), Number(cpiNoticePeriod)))
        : "",
  }));
}

// ─── Normalization Helpers ─────────────────────────────────────────────────────

function normalizeCustomer(api) {
  if (!api || typeof api !== "object") return null;
  const customerTypeValue =
    api.customerType?.customerType || api.customerType?.type || api.customerType || "";
  return {
    customerId: api.customerId ?? api.id ?? "",
    customerBillingName: api.customerBillingName ?? api.customerName ?? "",
    customerCode: api.customerCode ?? "",
    shortName: api.shortName ?? "",
    longName: api.longName ?? "",
    aliasName: api.aliasName ?? "",
    customerType: customerTypeValue,
    addressLine1: api.addressLine1 ?? "",
    addressLine2: api.addressLine2 ?? "",
    city: api.city ?? "",
    country: api.country ?? "",
    postalCode: api.postalCode ?? api.postCode ?? "",
    countryCode: api.countryCode ?? "",
    telephone: api.telephone ?? api.phone ?? api.telephoneNumber ?? "",
    email: api.email ?? "",
    website: api.website ?? "",
    status:
      api.status ??
      (typeof api.isActive === "boolean" ? (api.isActive ? "active" : "inactive") : "active"),
  };
}

// ─── Validation ────────────────────────────────────────────────────────────────

function validateField(name, value, formData) {
  if (REQUIRED_FIELDS.includes(name)) {
    if (!String(value ?? "").trim()) return "Field required";
  }
  if (name === "contactEmail" && value) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value).trim())) return "Enter a valid email";
  }
  if (name === "cpiNoticePeriod" && formData.cpiApplicable === "yes") {
    if (!String(value ?? "").trim()) return "Field required";
  }
  if (name === "cpiCapApplicable" && formData.cpiApplicable === "yes") {
    if (!String(value ?? "").trim()) return "Field required";
  }
  if (name === "cpiCapPercentage" && formData.cpiApplicable === "yes" && formData.cpiCapApplicable === "yes") {
    if (!String(value ?? "").trim()) return "Field required";
  }
  if (name === "contractEndDate" && value && formData.contractStartDate) {
    const start = parseDate(formData.contractStartDate);
    const end = parseDate(value);
    if (start && end && start > end) return "End date must be after start date";
  }
  return null;
}

function validateForm(formData, scheduleRows) {
  const errors = {};

  REQUIRED_FIELDS.forEach((field) => {
    const err = validateField(field, formData[field], formData);
    if (err) errors[field] = err;
  });

  if (formData.cpiApplicable === "yes") {
    const cpnErr = validateField("cpiNoticePeriod", formData.cpiNoticePeriod, formData);
    if (cpnErr) errors.cpiNoticePeriod = cpnErr;

    const ccaErr = validateField("cpiCapApplicable", formData.cpiCapApplicable, formData);
    if (ccaErr) errors.cpiCapApplicable = ccaErr;

    if (formData.cpiCapApplicable === "yes") {
      const ccpErr = validateField("cpiCapPercentage", formData.cpiCapPercentage, formData);
      if (ccpErr) errors.cpiCapPercentage = ccpErr;
    }
  }

  if (!Array.isArray(formData.serviceTypeIds) || formData.serviceTypeIds.length === 0) {
    errors.serviceTypeIds = "Select at least one service type";
  }

  if (scheduleRows.length > 0) {
    if (scheduleRows.some((row) => !(Number(row.invoiceAmount) > 0))) {
      errors.billingSchedule = "Invoice amount must be positive for all billing rows";
    }
  }

  return errors;
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function FormField({ label, children, error, hint, fullWidth = false }) {
  return (
    <div className={`field ${fullWidth ? "field--full" : ""}`}>
      <label className="field__label">{label}</label>
      {children}
      <div className="field__meta">
        {error ? <div className="field__error">{error}</div> : null}
        {!error && hint ? <div className="field__hint">{hint}</div> : null}
      </div>
    </div>
  );
}

// Multi-select dropdown for service types
function ServiceTypeDropdown({ options, selectedIds, onChange, disabled, error, loading, loadError }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(selectedIds);
  const dropdownRef = useRef(null);

  // Sync draft when parent changes (e.g. on reset)
  useEffect(() => {
    setDraft(selectedIds);
  }, [selectedIds]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handler(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDraft(selectedIds); // discard
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open, selectedIds]);

  function toggleItem(id) {
    setDraft((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function handleDone() {
    onChange(draft);
    setOpen(false);
  }

  function handleClear() {
    setDraft([]);
  }

  function handleOpen() {
    if (disabled) return;
    setDraft(selectedIds);
    setOpen(true);
  }

  const selectedLabels = options
    .filter((o) => selectedIds.includes(o.serviceTypeId))
    .map((o) => o.serviceTypeName)
    .join(", ");

  return (
    <div className={`service-dropdown ${error ? "service-dropdown--error" : ""}`} ref={dropdownRef}>
      <button
        type="button"
        className={`service-dropdown__trigger field__control ${error ? "field__control--error" : ""}`}
        onClick={handleOpen}
        disabled={disabled || loading}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="service-dropdown__label">
          {loading
            ? "Loading..."
            : selectedIds.length === 0
            ? "Select service types"
            : selectedLabels}
        </span>
        <span className="service-dropdown__arrow">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="service-dropdown__panel" role="listbox" aria-multiselectable="true">
          <div className="service-dropdown__list">
            {options.length === 0 ? (
              <div className="service-dropdown__empty">No service types available</div>
            ) : (
              options.map((item) => {
                const checked = draft.includes(item.serviceTypeId);
                return (
                  <label
                    key={item.serviceTypeId}
                    className={`service-dropdown__item ${checked ? "service-dropdown__item--selected" : ""}`}
                    title={item.serviceTypeDescription || ""}
                    role="option"
                    aria-selected={checked}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleItem(item.serviceTypeId)}
                    />
                    <span>{item.serviceTypeName}</span>
                  </label>
                );
              })
            )}
          </div>
          <div className="service-dropdown__footer">
            <button type="button" className="service-dropdown__btn service-dropdown__btn--clear" onClick={handleClear}>
              Clear
            </button>
            <button type="button" className="service-dropdown__btn service-dropdown__btn--done" onClick={handleDone}>
              Done
            </button>
          </div>
        </div>
      )}

      {loadError && <div className="contract-form__banner">{loadError}</div>}
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function ContractForm({
  mode = "add",
  initialValues = null,
  customerId: fixedCustomerId = "",
  auditUser = "system",
  // Props from parent (replaces internal fetches):
  customerOptions = [],        // [{ customerId, customerBillingName, customerCode }]
  customerLoading = false,
  customerError = "",
  selectedCustomer = null,     // full customer object (parent fetches when customerId changes)
  serviceTypeOptions = [],     // [{ serviceTypeId, serviceTypeName, serviceTypeDescription }]
  serviceTypeLoading = false,
  serviceTypeError = "",
  onCancel,
  onSubmit,
  onCustomerChange,            // called with customerId so parent can fetch details
}) {
  const isAddMode = mode === "add";
  const isViewMode = mode === "view";
  const canChangeCustomer = isAddMode && !fixedCustomerId;

  const mergedInitialValues = useMemo(() => ({
    ...EMPTY_FORM,
    ...(initialValues || {}),
    customerId: fixedCustomerId || initialValues?.customerId || "",
    status: initialValues?.status || "active",
    cpiApplicable: initialValues?.cpiApplicable || "no",
    cpiCapApplicable: initialValues?.cpiCapApplicable || "no",
    serviceTypeIds: Array.isArray(initialValues?.serviceTypeIds) ? initialValues.serviceTypeIds : [],
  }), [initialValues, fixedCustomerId]);

  const [formData, setFormData] = useState(mergedInitialValues);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [saving, setSaving] = useState(false);
  const [billingRows, setBillingRows] = useState([]);

  // Track previous global subscription amount to detect intentional global changes
  const prevSubscriptionRef = useRef(formData.subscriptionAmount);

  useEffect(() => {
    setFormData(mergedInitialValues);
    setErrors({});
    setTouched({});
    prevSubscriptionRef.current = mergedInitialValues.subscriptionAmount;
  }, [mergedInitialValues]);

  // Rebuild billing schedule when relevant fields change
  useEffect(() => {
    const nextRows = buildBillingSchedule({
      startDate: formData.contractStartDate,
      endDate: formData.contractEndDate,
      invoiceCycle: formData.invoiceCycle,
      subscriptionAmount: formData.subscriptionAmount,
      cpiApplicable: formData.cpiApplicable,
      cpiNoticePeriod: formData.cpiNoticePeriod,
    });

    setBillingRows((prevRows) => {
      const merged = mergeScheduleRows(prevRows, nextRows, Number(formData.subscriptionAmount));
      return recalcCpiNoticeDates(merged, formData.cpiNoticePeriod);
    });
  }, [
    formData.contractStartDate,
    formData.contractEndDate,
    formData.invoiceCycle,
    formData.subscriptionAmount,
    formData.cpiApplicable,
    formData.cpiNoticePeriod,
  ]);

  // When global subscription amount changes, update rows that haven't been individually edited
  useEffect(() => {
    const newAmount = Number(formData.subscriptionAmount);
    if (!newAmount || isNaN(newAmount)) return;

    setBillingRows((prev) =>
      prev.map((row) => ({ ...row, invoiceAmount: newAmount }))
    );
  }, [formData.subscriptionAmount]);

  // Notify parent of customer selection change
  useEffect(() => {
    if (onCustomerChange) onCustomerChange(formData.customerId);
  }, [formData.customerId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    if (touched[name]) {
      const err = validateField(name, value, { ...formData, [name]: value });
      setErrors((prev) => {
        const next = { ...prev };
        if (err) next[name] = err; else delete next[name];
        return next;
      });
    }
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    setTouched((prev) => ({ ...prev, [name]: true }));

    const err = validateField(name, value, formData);
    setErrors((prev) => {
      const next = { ...prev };
      if (err) next[name] = err; else delete next[name];
      return next;
    });
  };

  const handleAmountBlur = (e) => {
    const { name, value } = e.target;
    const num = parseFloat(value);
    if (!isNaN(num)) {
      const formatted = num.toFixed(2);
      setFormData((prev) => ({ ...prev, [name]: formatted }));

      if (touched[name]) {
        const err = validateField(name, formatted, { ...formData, [name]: formatted });
        setErrors((prev) => {
          const next = { ...prev };
          if (err) next[name] = err; else delete next[name];
          return next;
        });
      }
    }
    handleBlur(e);
  };

  const handleServiceTypeChange = (newIds) => {
    setFormData((prev) => ({ ...prev, serviceTypeIds: newIds }));
    if (newIds.length > 0) {
      setErrors((prev) => { const next = { ...prev }; delete next.serviceTypeIds; return next; });
    }
  };

  const handleScheduleAmountChange = (rowId, value) => {
    setBillingRows((prev) =>
      prev.map((row) => row.id === rowId ? { ...row, invoiceAmount: value } : row)
    );
  };

  const handleScheduleAmountBlur = (rowId, value) => {
    const num = parseFloat(value);
    if (!isNaN(num)) {
      setBillingRows((prev) =>
        prev.map((row) => row.id === rowId ? { ...row, invoiceAmount: num.toFixed(2) } : row)
      );
    }
  };

  const handleScheduleToggle = (rowId, checked) => {
    setBillingRows((prev) =>
      prev.map((row) => {
        if (row.id !== rowId) return row;
        const notice =
          checked && formData.cpiNoticePeriod
            ? formatDateISO(subtractDays(parseDate(row.invoiceStartDate), Number(formData.cpiNoticePeriod)))
            : "";
        return { ...row, cpiApplicable: checked, cpiNoticeDate: notice };
      })
    );
  };

  // ── Submit ─────────────────────────────────────────────────────────────────

  const buildPayload = () => {
    const selectedServiceTypes = serviceTypeOptions
      .filter((item) => formData.serviceTypeIds.includes(item.serviceTypeId))
      .map((item) => ({ serviceTypeId: item.serviceTypeId, serviceTypeName: item.serviceTypeName }));

    const base = {
      contractId: initialValues?.contractId ?? null,
      customerId: formData.customerId,
      poNumber: formData.poNumber.trim(),
      contactPerson: formData.contactPerson.trim(),
      contactEmail: formData.contactEmail.trim(),
      termCode: formData.termCode.trim(),
      currencyType: formData.currencyType.trim(),
      paymentMethod: formData.paymentMethod.trim(),
      numberOfUsers: formData.numberOfUsers ? Number(formData.numberOfUsers) : null,
      cpiApplicable: formData.cpiApplicable === "yes",
      cpiNoticePeriod: formData.cpiApplicable === "yes" && formData.cpiNoticePeriod ? Number(formData.cpiNoticePeriod) : null,
      cpiCapApplicable: formData.cpiApplicable === "yes" && formData.cpiCapApplicable === "yes",
      cpiCapPercentage:
        formData.cpiApplicable === "yes" && formData.cpiCapApplicable === "yes" && formData.cpiCapPercentage
          ? Number(formData.cpiCapPercentage)
          : null,
      invoiceCycle: formData.invoiceCycle,
      subscriptionAmount: Number(formData.subscriptionAmount),
      totalEstimatedContractValue: Number(formData.totalEstimatedContractValue),
      contractStartDate: formData.contractStartDate,
      contractEndDate: formData.contractEndDate,
      serviceTypeIds: formData.serviceTypeIds,
      serviceTypes: selectedServiceTypes,
      status: formData.status,
      isActive: formData.status === "active",
      billingSchedules: billingRows.map((row) => ({
        scheduleNo: row.scheduleNo,
        invoiceStartDate: row.invoiceStartDate,
        invoiceEndDate: row.invoiceEndDate,
        invoiceAmount: Number(row.invoiceAmount),
        cpiApplicable: row.cpiApplicable,
        cpiNoticeDate: row.cpiNoticeDate || null,
        invoiceGenerated: row.invoiceGenerated || false,
      })),
      customerSnapshot: selectedCustomer,
    };

    return isAddMode
      ? { ...base, createdBy: auditUser, updatedBy: auditUser }
      : { ...base, updatedBy: auditUser };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isViewMode) return;

    // Mark all fields touched
    const allTouched = {};
    REQUIRED_FIELDS.forEach((f) => { allTouched[f] = true; });
    setTouched(allTouched);

    const nextErrors = validateForm(formData, billingRows);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSaving(true);
    try {
      await onSubmit?.(buildPayload());
    } finally {
      setSaving(false);
    }
  };

  // ── Helpers ────────────────────────────────────────────────────────────────

  const controlClass = (name) =>
    `field__control ${errors[name] ? "field__control--error" : ""}`;

  const fieldProps = (name, extra = {}) => ({
    name,
    value: formData[name],
    onChange: handleChange,
    onBlur: handleBlur,
    disabled: isViewMode,
    className: controlClass(name),
    ...extra,
  });

  const amountFieldProps = (name, extra = {}) => ({
    ...fieldProps(name, extra),
    onBlur: handleAmountBlur,
    type: "number",
    min: "0",
    step: "0.01",
  });

  const cpiApplicable = formData.cpiApplicable === "yes";

  return (
    <form className="contract-form" onSubmit={handleSubmit} noValidate>

      {/* ── Customer ── */}
      <section className="form-section">
        <h3>Customer</h3>
        <div className="form-grid">
          {canChangeCustomer ? (
            <FormField label="Choose Customer" error={errors.customerId}>
              <select
                {...fieldProps("customerId")}
                disabled={isViewMode || customerLoading}
              >
                <option value="">Select customer</option>
                {customerOptions.map((item) => (
                  <option key={item.customerId} value={item.customerId}>
                    {item.customerBillingName}
                  </option>
                ))}
              </select>
            </FormField>
          ) : (
            <FormField label="Selected Customer">
              <input type="text" disabled className="field__control" value={selectedCustomer?.customerBillingName || ""} />
            </FormField>
          )}

          {[
            ["Customer Code", "customerCode"],
            ["Short Name", "shortName"],
            ["Long Name", "longName"],
            ["Alias Name", "aliasName"],
            ["Customer Type", "customerType"],
          ].map(([label, key]) => (
            <FormField key={key} label={label}>
              <input type="text" disabled className="field__control" value={selectedCustomer?.[key] || ""} />
            </FormField>
          ))}

          <FormField label="Address Line 1" fullWidth>
            <input type="text" disabled className="field__control" value={selectedCustomer?.addressLine1 || ""} />
          </FormField>
          <FormField label="Address Line 2" fullWidth>
            <input type="text" disabled className="field__control" value={selectedCustomer?.addressLine2 || ""} />
          </FormField>

          {[
            ["City", "city"],
            ["Country", "country"],
            ["Postal Code", "postalCode"],
            ["Country Code", "countryCode"],
            ["Telephone", "telephone"],
            ["Email", "email"],
            ["Website", "website"],
            ["Status", "status"],
          ].map(([label, key]) => (
            <FormField key={key} label={label}>
              <input type="text" disabled className="field__control" value={selectedCustomer?.[key] || ""} />
            </FormField>
          ))}
        </div>

        {customerError && <div className="contract-form__banner">{customerError}</div>}
        {customerLoading && <div className="contract-form__banner">Loading customer...</div>}
      </section>

      {/* ── Commercial Terms ── */}
      <section className="form-section">
        <h3>Commercial Terms</h3>
        <div className="form-grid">
          <FormField label="PO Number">
            <input {...fieldProps("poNumber")} type="text" className="field__control" />
          </FormField>

          <FormField label="Contact Person" error={errors.contactPerson}>
            <input {...fieldProps("contactPerson")} type="text" />
          </FormField>

          <FormField label="Contact Email" error={errors.contactEmail}>
            <input {...fieldProps("contactEmail")} type="email" />
          </FormField>

          <FormField label="Term Code">
            <input {...fieldProps("termCode")} type="text" className="field__control" />
          </FormField>

          <FormField label="Currency Type" error={errors.currencyType}>
            <input {...fieldProps("currencyType")} type="text" placeholder="e.g. INR" />
          </FormField>

          <FormField label="Payment Method">
            <input {...fieldProps("paymentMethod")} type="text" className="field__control" />
          </FormField>

          <FormField label="Number of Users">
            <input {...fieldProps("numberOfUsers")} type="number" min="0" className="field__control" />
          </FormField>

          <FormField label="CPI Applicable" error={errors.cpiApplicable}>
            <select {...fieldProps("cpiApplicable")}>
              <option value="">Select</option>
              <option value="yes">Applicable</option>
              <option value="no">Not Applicable</option>
            </select>
          </FormField>

          {cpiApplicable && (
            <>
              <FormField label="CPI Notice Period (days)" error={errors.cpiNoticePeriod}>
                <input {...fieldProps("cpiNoticePeriod")} type="number" min="0" />
              </FormField>

              <FormField label="CPI Cap Applicable" error={errors.cpiCapApplicable}>
                <select {...fieldProps("cpiCapApplicable")}>
                  <option value="">Select</option>
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </select>
              </FormField>

              {formData.cpiCapApplicable === "yes" && (
                <FormField label="Cap Percentage (%)" error={errors.cpiCapPercentage}>
                  <input {...amountFieldProps("cpiCapPercentage")} />
                </FormField>
              )}
            </>
          )}

          {/* Service Types Dropdown */}
          <div className="field field--full">
            <label className="field__label">Service Types</label>
            <ServiceTypeDropdown
              options={serviceTypeOptions}
              selectedIds={formData.serviceTypeIds}
              onChange={handleServiceTypeChange}
              disabled={isViewMode}
              error={errors.serviceTypeIds}
              loading={serviceTypeLoading}
              loadError={serviceTypeError}
            />
            <div className="field__meta">
              {errors.serviceTypeIds && <div className="field__error">{errors.serviceTypeIds}</div>}
            </div>
          </div>

          <FormField label="Invoice Cycle" error={errors.invoiceCycle}>
            <select {...fieldProps("invoiceCycle")}>
              <option value="">Select cycle</option>
              {INVOICE_CYCLE_OPTIONS.map((item) => (
                <option key={item.value} value={item.value}>{item.label}</option>
              ))}
            </select>
          </FormField>

          <FormField label="Subscription Amount" error={errors.subscriptionAmount}>
            <input {...amountFieldProps("subscriptionAmount")} />
          </FormField>

          <FormField label="Total Estimated Contract Value" error={errors.totalEstimatedContractValue}>
            <input {...amountFieldProps("totalEstimatedContractValue")} />
          </FormField>

          <FormField label="Contract Start Date" error={errors.contractStartDate}>
            <input {...fieldProps("contractStartDate")} type="date" />
          </FormField>

          <FormField label="Contract End Date" error={errors.contractEndDate}>
            <input {...fieldProps("contractEndDate")} type="date" />
          </FormField>
        </div>
      </section>

      {/* ── Billing Schedule ── */}
      {billingRows.length > 0 && (
        <section className="form-section">
          <h3>Billing Schedule</h3>

          {errors.billingSchedule && (
            <div className="contract-form__banner contract-form__banner--error">
              {errors.billingSchedule}
            </div>
          )}

          <div className="billing-table-wrap">
            <table className="billing-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Invoice Start Date</th>
                  <th>Invoice End Date</th>
                  <th>Invoice Amount</th>
                  {cpiApplicable && <th>CPI Applicable</th>}
                  {cpiApplicable && <th>CPI Notice Date</th>}
                  <th>Invoiced</th>
                </tr>
              </thead>
              <tbody>
                {billingRows.map((row) => (
                  <tr key={row.id}>
                    <td>{row.scheduleNo}</td>
                    <td>{formatDateDisplay(row.invoiceStartDate)}</td>
                    <td>{formatDateDisplay(row.invoiceEndDate)}</td>
                    <td>
                      {cpiApplicable && row.cpiApplicable ? (
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={row.invoiceAmount}
                          onChange={(e) => handleScheduleAmountChange(row.id, e.target.value)}
                          onBlur={(e) => handleScheduleAmountBlur(row.id, e.target.value)}
                          disabled={isViewMode}
                          className="billing-input"
                        />
                      ) : (
                        <span>{Number(row.invoiceAmount).toFixed(2)}</span>
                      )}
                    </td>
                    {cpiApplicable && (
                      <td>
                        <label className="billing-checkbox">
                          <input
                            type="checkbox"
                            checked={row.cpiApplicable}
                            onChange={(e) => handleScheduleToggle(row.id, e.target.checked)}
                            disabled={isViewMode}
                          />
                          <span>Yes</span>
                        </label>
                      </td>
                    )}
                    {cpiApplicable && (
                      <td>{row.cpiApplicable ? formatDateDisplay(row.cpiNoticeDate) || "-" : "-"}</td>
                    )}
                    <td>
                      <button
                        type="button"
                        className={`billing-download-btn ${row.invoiceGenerated ? "billing-download-btn--active" : ""}`}
                        disabled={!row.invoiceGenerated}
                      >
                        Download
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* ── Status (edit/view only) ── */}
      {!isAddMode && (
        <section className="form-section">
          <h3>Status</h3>
          <div className={`status-group ${errors.status ? "status-group--error" : ""}`}>
            {["active", "inactive"].map((val) => (
              <label key={val} className="status-option">
                <input
                  type="radio"
                  name="status"
                  value={val}
                  checked={formData.status === val}
                  onChange={handleChange}
                  disabled={isViewMode}
                />
                <span>{val.charAt(0).toUpperCase() + val.slice(1)}</span>
              </label>
            ))}
          </div>
          {errors.status && <div className="field__error">{errors.status}</div>}
        </section>
      )}

      {/* ── Actions ── */}
      <div className="contract-form__actions">
        <button type="button" className="btn btn--secondary" onClick={onCancel} disabled={saving}>
          Cancel
        </button>
        {!isViewMode && (
          <button
            type="submit"
            className="btn btn--primary"
            disabled={saving || customerLoading || serviceTypeLoading}
          >
            {saving ? "Saving..." : isAddMode ? "Submit" : "Save"}
          </button>
        )}
      </div>
    </form>
  );
}
