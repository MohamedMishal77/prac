import React, { useEffect, useMemo, useState } from "react";
import "./ContractForm.css";

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

const FALLBACK_INVOICE_CYCLE_OPTIONS = [
  { label: "Monthly", value: "monthly", months: 1 },
  { label: "Quarterly", value: "quarterly", months: 3 },
  { label: "Half-Yearly", value: "half-yearly", months: 6 },
  { label: "Annual", value: "annual", months: 12 },
];

function parseDate(value) {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDate(date) {
  if (!date || Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function addMonthsSafe(date, months) {
  const next = new Date(date);
  const day = next.getDate();
  next.setMonth(next.getMonth() + months);

  if (next.getDate() < day) {
    next.setDate(0);
  }

  return next;
}

function subtractDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() - days);
  return next;
}

function getCycleMonths(cycle) {
  const option = FALLBACK_INVOICE_CYCLE_OPTIONS.find((item) => item.value === cycle);
  return option?.months || 0;
}

function buildBillingSchedule({
  startDate,
  endDate,
  invoiceCycle,
  subscriptionAmount,
  cpiApplicable,
  cpiNoticePeriod,
}) {
  const start = parseDate(startDate);
  const end = parseDate(endDate);
  const baseAmount = Number(subscriptionAmount);

  if (!start || !end || start > end || !invoiceCycle || !(baseAmount > 0)) {
    return [];
  }

  const cycleMonths = getCycleMonths(invoiceCycle);
  if (!cycleMonths) return [];

  const rows = [];
  let currentStart = new Date(start);
  let rowIndex = 1;

  while (currentStart <= end && rowIndex < 1000) {
    const nextStart = addMonthsSafe(currentStart, cycleMonths);
    let currentEnd = subtractDays(nextStart, 1);
    if (currentEnd > end) currentEnd = new Date(end);

    rows.push({
      id: `${rowIndex}-${formatDate(currentStart)}-${formatDate(currentEnd)}`,
      scheduleNo: rowIndex,
      invoiceStartDate: formatDate(currentStart),
      invoiceEndDate: formatDate(currentEnd),
      invoiceAmount: baseAmount,
      cpiApplicable: false,
      cpiNoticeDate:
        cpiApplicable === "yes" && cpiNoticePeriod
          ? formatDate(subtractDays(currentStart, Number(cpiNoticePeriod)))
          : "",
      invoiceGenerated: false,
    });

    currentStart = new Date(nextStart);
    rowIndex += 1;
  }

  return rows;
}

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

function normalizeCustomer(api) {
  if (!api || typeof api !== "object") return null;

  const customerTypeValue =
    api.customerType?.customerType ||
    api.customerType?.type ||
    api.customerType ||
    "";

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

function normalizeCustomerList(body) {
  const raw = Array.isArray(body)
    ? body
    : Array.isArray(body?.data)
      ? body.data
      : Array.isArray(body?.customers)
        ? body.customers
        : [];

  return raw
    .map((item) => ({
      customerId: item.customerId ?? item.id ?? "",
      customerBillingName: item.customerBillingName ?? item.customerName ?? item.name ?? "",
      customerCode: item.customerCode ?? "",
    }))
    .filter((item) => String(item.customerId).trim() && String(item.customerBillingName).trim());
}

function normalizeServiceTypes(body) {
  if (Array.isArray(body)) {
    return body
      .map((item) => ({
        serviceTypeId: item.serviceTypeId ?? item.id ?? "",
        serviceTypeName: item.serviceTypeName ?? item.name ?? item.label ?? "",
        serviceTypeDescription: item.serviceTypeDescription ?? item.description ?? "",
      }))
      .filter((item) => String(item.serviceTypeId).trim() && String(item.serviceTypeName).trim());
  }

  const raw =
    body?.data && typeof body.data === "object"
      ? body.data
      : body && typeof body === "object"
        ? body
        : {};

  return Object.entries(raw)
    .map(([serviceTypeId, value]) => ({
      serviceTypeId: String(serviceTypeId),
      serviceTypeName: value?.name ?? value?.serviceTypeName ?? value?.label ?? "",
      serviceTypeDescription: value?.description ?? value?.serviceTypeDescription ?? "",
    }))
    .filter((item) => String(item.serviceTypeId).trim() && String(item.serviceTypeName).trim());
}

function validateForm(formData, scheduleRows) {
  const errors = {};

  const requiredFields = [
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

  requiredFields.forEach((field) => {
    if (!String(formData[field] ?? "").trim()) {
      errors[field] = "Field required";
    }
  });

  if (formData.contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(formData.contactEmail).trim())) {
    errors.contactEmail = "Enter a valid email";
  }

  if (formData.cpiApplicable === "yes" && !String(formData.cpiNoticePeriod || "").trim()) {
    errors.cpiNoticePeriod = "Field required";
  }

  if (formData.cpiApplicable === "yes" && !String(formData.cpiCapApplicable || "").trim()) {
    errors.cpiCapApplicable = "Field required";
  }

  if (formData.cpiApplicable === "yes" && formData.cpiCapApplicable === "yes") {
    if (!String(formData.cpiCapPercentage || "").trim()) {
      errors.cpiCapPercentage = "Field required";
    }
  }

  if (!Array.isArray(formData.serviceTypeIds) || formData.serviceTypeIds.length === 0) {
    errors.serviceTypeIds = "Select at least one service type";
  }

  const start = parseDate(formData.contractStartDate);
  const end = parseDate(formData.contractEndDate);

  if (start && end && start > end) {
    errors.contractEndDate = "End date must be after start date";
  }

  if (scheduleRows.length > 0) {
    const invalidRow = scheduleRows.some((row) => !(Number(row.invoiceAmount) > 0));
    if (invalidRow) {
      errors.billingSchedule = "Invoice amount must be positive for all billing rows";
    }
  }

  return errors;
}

function mergeScheduleRows(prevRows, nextRows) {
  const prevMap = new Map(prevRows.map((row) => [row.scheduleNo, row]));

  return nextRows.map((row) => {
    const prev = prevMap.get(row.scheduleNo);
    if (!prev) return row;

    return {
      ...row,
      invoiceAmount: prev.invoiceAmount ?? row.invoiceAmount,
      cpiApplicable: prev.cpiApplicable ?? row.cpiApplicable,
      invoiceGenerated: prev.invoiceGenerated ?? row.invoiceGenerated,
    };
  });
}

export default function ContractForm({
  mode = "add",
  initialValues = null,
  customerId: fixedCustomerId = "",
  auditUser = "system",
  onCancel,
  onSubmit,
}) {
  const isAddMode = mode === "add";
  const isViewMode = mode === "view";

  const mergedInitialValues = useMemo(() => {
    return {
      ...EMPTY_FORM,
      ...(initialValues || {}),
      customerId: fixedCustomerId || initialValues?.customerId || "",
      status: initialValues?.status || "active",
      cpiApplicable: initialValues?.cpiApplicable || "no",
      cpiCapApplicable: initialValues?.cpiCapApplicable || "no",
      serviceTypeIds: Array.isArray(initialValues?.serviceTypeIds)
        ? initialValues.serviceTypeIds
        : [],
    };
  }, [initialValues, fixedCustomerId]);

  const canChangeCustomer = isAddMode && !fixedCustomerId;

  const [formData, setFormData] = useState(mergedInitialValues);
  const [errors, setErrors] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);

  const [customerOptions, setCustomerOptions] = useState([]);
  const [customerLoading, setCustomerLoading] = useState(false);
  const [customerError, setCustomerError] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  const [serviceTypeOptions, setServiceTypeOptions] = useState([]);
  const [serviceTypeLoading, setServiceTypeLoading] = useState(false);
  const [serviceTypeError, setServiceTypeError] = useState("");

  const [billingRows, setBillingRows] = useState([]);

  const invoiceCycleOptions = FALLBACK_INVOICE_CYCLE_OPTIONS;

  useEffect(() => {
    setFormData(mergedInitialValues);
    setErrors({});
    setSubmitted(false);
  }, [mergedInitialValues]);

  useEffect(() => {
    let cancelled = false;

    async function loadCustomers() {
      if (!canChangeCustomer) return;

      try {
        setCustomerLoading(true);
        setCustomerError("");

        const res = await fetch("/api/customers");
        if (!res.ok) throw new Error("Failed to load customers");

        const body = await res.json();
        const normalized = normalizeCustomerList(body);

        if (!cancelled) {
          setCustomerOptions(normalized);
        }
      } catch {
        if (!cancelled) {
          setCustomerError("Customer list could not be loaded.");
          setCustomerOptions([]);
        }
      } finally {
        if (!cancelled) setCustomerLoading(false);
      }
    }

    loadCustomers();

    return () => {
      cancelled = true;
    };
  }, [canChangeCustomer]);

  useEffect(() => {
    let cancelled = false;

    async function loadServiceTypes() {
      try {
        setServiceTypeLoading(true);
        setServiceTypeError("");

        const res = await fetch("/api/service-types");
        if (!res.ok) throw new Error("Failed to load service types");

        const body = await res.json();
        const normalized = normalizeServiceTypes(body);

        if (!cancelled) {
          setServiceTypeOptions(normalized);
        }
      } catch {
        if (!cancelled) {
          setServiceTypeError("Service types could not be loaded.");
          setServiceTypeOptions([]);
        }
      } finally {
        if (!cancelled) setServiceTypeLoading(false);
      }
    }

    loadServiceTypes();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadSelectedCustomer(id) {
      if (!id) {
        setSelectedCustomer(null);
        return;
      }

      try {
        const res = await fetch(`/api/customers/${id}`);
        if (!res.ok) throw new Error("Failed to load customer");

        const body = await res.json();
        const apiCustomer = body?.data ?? body;
        const normalized = normalizeCustomer(apiCustomer);

        if (!cancelled) {
          setSelectedCustomer(normalized);
        }
      } catch {
        if (!cancelled) {
          setSelectedCustomer(null);
        }
      }
    }

    loadSelectedCustomer(formData.customerId);

    return () => {
      cancelled = true;
    };
  }, [formData.customerId]);

  useEffect(() => {
    const nextRows = buildBillingSchedule({
      startDate: formData.contractStartDate,
      endDate: formData.contractEndDate,
      invoiceCycle: formData.invoiceCycle,
      subscriptionAmount: formData.subscriptionAmount,
      cpiApplicable: formData.cpiApplicable,
      cpiNoticePeriod: formData.cpiNoticePeriod,
    });

    setBillingRows((prevRows) => mergeScheduleRows(prevRows, nextRows));
  }, [
    formData.contractStartDate,
    formData.contractEndDate,
    formData.invoiceCycle,
    formData.subscriptionAmount,
    formData.cpiApplicable,
    formData.cpiNoticePeriod,
  ]);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    setErrors((prev) => {
      if (!prev[name]) return prev;
      if (String(value ?? "").trim()) {
        const next = { ...prev };
        delete next[name];
        return next;
      }
      return prev;
    });
  };

  const handleServiceToggle = (serviceTypeId) => {
    setFormData((prev) => {
      const exists = prev.serviceTypeIds.includes(serviceTypeId);
      const nextIds = exists
        ? prev.serviceTypeIds.filter((id) => id !== serviceTypeId)
        : [...prev.serviceTypeIds, serviceTypeId];

      if (nextIds.length > 0) {
        setErrors((prevErrors) => {
          if (!prevErrors.serviceTypeIds) return prevErrors;
          const next = { ...prevErrors };
          delete next.serviceTypeIds;
          return next;
        });
      }

      return {
        ...prev,
        serviceTypeIds: nextIds,
      };
    });
  };

  const handleScheduleAmountChange = (rowId, value) => {
    setBillingRows((prev) =>
      prev.map((row) =>
        row.id === rowId
          ? { ...row, invoiceAmount: value }
          : row
      )
    );
  };

  const handleScheduleToggle = (rowId, checked) => {
    setBillingRows((prev) =>
      prev.map((row) => {
        if (row.id !== rowId) return row;

        return {
          ...row,
          cpiApplicable: checked,
          invoiceAmount: checked ? row.invoiceAmount || row.invoiceAmount : row.invoiceAmount,
        };
      })
    );
  };

  const buildPayload = () => {
    const selectedServiceTypes = serviceTypeOptions
      .filter((item) => formData.serviceTypeIds.includes(item.serviceTypeId))
      .map((item) => ({
        serviceTypeId: item.serviceTypeId,
        serviceTypeName: item.serviceTypeName,
      }));

    const basePayload = {
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
      cpiNoticePeriod:
        formData.cpiApplicable === "yes" && formData.cpiNoticePeriod
          ? Number(formData.cpiNoticePeriod)
          : null,
      cpiCapApplicable: formData.cpiApplicable === "yes" && formData.cpiCapApplicable === "yes",
      cpiCapPercentage:
        formData.cpiApplicable === "yes" &&
        formData.cpiCapApplicable === "yes" &&
        formData.cpiCapPercentage
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

    if (isAddMode) {
      return {
        ...basePayload,
        createdBy: auditUser,
        updatedBy: auditUser,
      };
    }

    return {
      ...basePayload,
      updatedBy: auditUser,
    };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isViewMode) return;

    const nextErrors = validateForm(formData, billingRows);
    setSubmitted(true);
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) return;

    setSaving(true);
    try {
      await onSubmit?.(buildPayload());
    } finally {
      setSaving(false);
    }
  };

  const controlClass = (fieldName) =>
    `field__control ${errors[fieldName] ? "field__control--error" : ""}`;

  const submitLabel = isAddMode ? "Submit" : "Save";

  return (
    <form className="contract-form" onSubmit={handleSubmit} noValidate>
      <section className="form-section">
        <h3>Customer</h3>

        <div className="form-grid">
          {canChangeCustomer ? (
            <FormField label="Choose Customer" error={errors.customerId}>
              <select
                name="customerId"
                value={formData.customerId}
                onChange={handleChange}
                disabled={isViewMode || customerLoading}
                className={controlClass("customerId")}
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
              <input
                type="text"
                disabled
                className="field__control"
                value={selectedCustomer?.customerBillingName || ""}
              />
            </FormField>
          )}

          <FormField label="Customer Code">
            <input
              type="text"
              disabled
              className="field__control"
              value={selectedCustomer?.customerCode || ""}
            />
          </FormField>

          <FormField label="Short Name">
            <input
              type="text"
              disabled
              className="field__control"
              value={selectedCustomer?.shortName || ""}
            />
          </FormField>

          <FormField label="Long Name">
            <input
              type="text"
              disabled
              className="field__control"
              value={selectedCustomer?.longName || ""}
            />
          </FormField>

          <FormField label="Alias Name">
            <input
              type="text"
              disabled
              className="field__control"
              value={selectedCustomer?.aliasName || ""}
            />
          </FormField>

          <FormField label="Customer Type">
            <input
              type="text"
              disabled
              className="field__control"
              value={selectedCustomer?.customerType || ""}
            />
          </FormField>

          <FormField label="Address Line 1" fullWidth>
            <input
              type="text"
              disabled
              className="field__control"
              value={selectedCustomer?.addressLine1 || ""}
            />
          </FormField>

          <FormField label="Address Line 2" fullWidth>
            <input
              type="text"
              disabled
              className="field__control"
              value={selectedCustomer?.addressLine2 || ""}
            />
          </FormField>

          <FormField label="City">
            <input
              type="text"
              disabled
              className="field__control"
              value={selectedCustomer?.city || ""}
            />
          </FormField>

          <FormField label="Country">
            <input
              type="text"
              disabled
              className="field__control"
              value={selectedCustomer?.country || ""}
            />
          </FormField>

          <FormField label="Postal Code">
            <input
              type="text"
              disabled
              className="field__control"
              value={selectedCustomer?.postalCode || ""}
            />
          </FormField>

          <FormField label="Country Code">
            <input
              type="text"
              disabled
              className="field__control"
              value={selectedCustomer?.countryCode || ""}
            />
          </FormField>

          <FormField label="Telephone">
            <input
              type="text"
              disabled
              className="field__control"
              value={selectedCustomer?.telephone || ""}
            />
          </FormField>

          <FormField label="Email">
            <input
              type="text"
              disabled
              className="field__control"
              value={selectedCustomer?.email || ""}
            />
          </FormField>

          <FormField label="Website">
            <input
              type="text"
              disabled
              className="field__control"
              value={selectedCustomer?.website || ""}
            />
          </FormField>

          <FormField label="Status">
            <input
              type="text"
              disabled
              className="field__control"
              value={selectedCustomer?.status || ""}
            />
          </FormField>
        </div>

        {customerError ? <div className="contract-form__banner">{customerError}</div> : null}
        {customerLoading ? <div className="contract-form__banner">Loading customer...</div> : null}
      </section>

      <section className="form-section">
        <h3>Commercial Terms</h3>

        <div className="form-grid">
          <FormField label="PO Number">
            <input
              name="poNumber"
              value={formData.poNumber}
              onChange={handleChange}
              disabled={isViewMode}
              className="field__control"
              type="text"
            />
          </FormField>

          <FormField label="Contact Person" error={errors.contactPerson}>
            <input
              name="contactPerson"
              value={formData.contactPerson}
              onChange={handleChange}
              disabled={isViewMode}
              className={controlClass("contactPerson")}
              type="text"
            />
          </FormField>

          <FormField label="Contact Email" error={errors.contactEmail}>
            <input
              name="contactEmail"
              value={formData.contactEmail}
              onChange={handleChange}
              disabled={isViewMode}
              className={controlClass("contactEmail")}
              type="email"
            />
          </FormField>

          <FormField label="Term Code">
            <input
              name="termCode"
              value={formData.termCode}
              onChange={handleChange}
              disabled={isViewMode}
              className="field__control"
              type="text"
            />
          </FormField>

          <FormField label="Currency Type" error={errors.currencyType}>
            <input
              name="currencyType"
              value={formData.currencyType}
              onChange={handleChange}
              disabled={isViewMode}
              className={controlClass("currencyType")}
              type="text"
              placeholder="e.g. INR"
            />
          </FormField>

          <FormField label="Payment Method">
            <input
              name="paymentMethod"
              value={formData.paymentMethod}
              onChange={handleChange}
              disabled={isViewMode}
              className="field__control"
              type="text"
            />
          </FormField>

          <FormField label="Number of Users">
            <input
              name="numberOfUsers"
              value={formData.numberOfUsers}
              onChange={handleChange}
              disabled={isViewMode}
              className="field__control"
              type="number"
              min="0"
            />
          </FormField>

          <FormField label="CPI Applicable" error={errors.cpiApplicable}>
            <select
              name="cpiApplicable"
              value={formData.cpiApplicable}
              onChange={handleChange}
              disabled={isViewMode}
              className={controlClass("cpiApplicable")}
            >
              <option value="">Select</option>
              <option value="yes">Applicable</option>
              <option value="no">Not Applicable</option>
            </select>
          </FormField>

          {formData.cpiApplicable === "yes" && (
            <>
              <FormField label="CPI Notice Period" error={errors.cpiNoticePeriod}>
                <input
                  name="cpiNoticePeriod"
                  value={formData.cpiNoticePeriod}
                  onChange={handleChange}
                  disabled={isViewMode}
                  className={controlClass("cpiNoticePeriod")}
                  type="number"
                  min="0"
                />
              </FormField>

              <FormField label="CPI Cap Applicable" error={errors.cpiCapApplicable}>
                <select
                  name="cpiCapApplicable"
                  value={formData.cpiCapApplicable}
                  onChange={handleChange}
                  disabled={isViewMode}
                  className={controlClass("cpiCapApplicable")}
                >
                  <option value="">Select</option>
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </select>
              </FormField>

              {formData.cpiCapApplicable === "yes" && (
                <FormField label="Cap Percentage" error={errors.cpiCapPercentage}>
                  <input
                    name="cpiCapPercentage"
                    value={formData.cpiCapPercentage}
                    onChange={handleChange}
                    disabled={isViewMode}
                    className={controlClass("cpiCapPercentage")}
                    type="number"
                    min="0"
                    step="0.01"
                  />
                </FormField>
              )}
            </>
          )}

          <div className="field field--full">
            <label className="field__label">Service Types</label>
            <div className={`checkbox-grid ${errors.serviceTypeIds ? "checkbox-grid--error" : ""}`}>
              {serviceTypeLoading ? (
                <div className="contract-form__banner">Loading service types...</div>
              ) : serviceTypeOptions.length > 0 ? (
                serviceTypeOptions.map((item) => {
                  const checked = formData.serviceTypeIds.includes(item.serviceTypeId);

                  return (
                    <label
                      key={item.serviceTypeId}
                      className="checkbox-item"
                      title={item.serviceTypeDescription || ""}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={isViewMode}
                        onChange={() => handleServiceToggle(item.serviceTypeId)}
                      />
                      <span>{item.serviceTypeName}</span>
                    </label>
                  );
                })
              ) : (
                <div className="contract-form__banner">No service types available.</div>
              )}
            </div>
            <div className="field__meta">
              {errors.serviceTypeIds ? <div className="field__error">{errors.serviceTypeIds}</div> : null}
            </div>
            {serviceTypeError ? <div className="contract-form__banner">{serviceTypeError}</div> : null}
          </div>

          <FormField label="Invoice Cycle" error={errors.invoiceCycle}>
            <select
              name="invoiceCycle"
              value={formData.invoiceCycle}
              onChange={handleChange}
              disabled={isViewMode}
              className={controlClass("invoiceCycle")}
            >
              <option value="">Select cycle</option>
              {invoiceCycleOptions.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </FormField>

          <FormField label="Subscription Amount" error={errors.subscriptionAmount}>
            <input
              name="subscriptionAmount"
              value={formData.subscriptionAmount}
              onChange={handleChange}
              disabled={isViewMode}
              className={controlClass("subscriptionAmount")}
              type="number"
              min="0"
              step="0.01"
            />
          </FormField>

          <FormField
            label="Total Estimated Contract Value"
            error={errors.totalEstimatedContractValue}
          >
            <input
              name="totalEstimatedContractValue"
              value={formData.totalEstimatedContractValue}
              onChange={handleChange}
              disabled={isViewMode}
              className={controlClass("totalEstimatedContractValue")}
              type="number"
              min="0"
              step="0.01"
            />
          </FormField>

          <FormField label="Contract Start Date" error={errors.contractStartDate}>
            <input
              name="contractStartDate"
              value={formData.contractStartDate}
              onChange={handleChange}
              disabled={isViewMode}
              className={controlClass("contractStartDate")}
              type="date"
            />
          </FormField>

          <FormField label="Contract End Date" error={errors.contractEndDate}>
            <input
              name="contractEndDate"
              value={formData.contractEndDate}
              onChange={handleChange}
              disabled={isViewMode}
              className={controlClass("contractEndDate")}
              type="date"
            />
          </FormField>
        </div>
      </section>

      {billingRows.length > 0 && (
        <section className="form-section">
          <h3>Billing Schedule</h3>

          {errors.billingSchedule ? (
            <div className="contract-form__banner contract-form__banner--error">
              {errors.billingSchedule}
            </div>
          ) : null}

          <div className="billing-table-wrap">
            <table className="billing-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Invoice Start Date</th>
                  <th>Invoice End Date</th>
                  <th>Invoice Amount</th>
                  {formData.cpiApplicable === "yes" && <th>CPI Applicable</th>}
                  {formData.cpiApplicable === "yes" && <th>CPI Notice Date</th>}
                  <th>Invoiced</th>
                </tr>
              </thead>
              <tbody>
                {billingRows.map((row) => (
                  <tr key={row.id}>
                    <td>{row.scheduleNo}</td>
                    <td>{row.invoiceStartDate}</td>
                    <td>{row.invoiceEndDate}</td>
                    <td>
                      {formData.cpiApplicable === "yes" && row.cpiApplicable ? (
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={row.invoiceAmount}
                          onChange={(e) => handleScheduleAmountChange(row.id, e.target.value)}
                          disabled={isViewMode}
                          className="billing-input"
                        />
                      ) : (
                        <span>{row.invoiceAmount}</span>
                      )}
                    </td>
                    {formData.cpiApplicable === "yes" && (
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
                    {formData.cpiApplicable === "yes" && <td>{row.cpiNoticeDate || "-"}</td>}
                    <td>
                      <button type="button" className="billing-download-btn" disabled>
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

      {!isAddMode && (
        <section className="form-section">
          <h3>Status</h3>
          <div className={`status-group ${errors.status ? "status-group--error" : ""}`}>
            <label className="status-option">
              <input
                type="radio"
                name="status"
                value="active"
                checked={formData.status === "active"}
                onChange={handleChange}
                disabled={isViewMode}
              />
              <span>Active</span>
            </label>

            <label className="status-option">
              <input
                type="radio"
                name="status"
                value="inactive"
                checked={formData.status === "inactive"}
                onChange={handleChange}
                disabled={isViewMode}
              />
              <span>Inactive</span>
            </label>
          </div>
          {errors.status ? <div className="field__error">{errors.status}</div> : null}
        </section>
      )}

      <div className="contract-form__actions">
        <button type="button" className="btn btn--secondary" onClick={onCancel} disabled={saving}>
          Cancel
        </button>

        {!isViewMode && (
          <button type="submit" className="btn btn--primary" disabled={saving || customerLoading || serviceTypeLoading}>
            {saving ? "Saving..." : submitLabel}
          </button>
        )}
      </div>
    </form>
  );
}
