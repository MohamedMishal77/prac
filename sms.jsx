// CustomerForm.jsx
import React, { useEffect, useMemo, useState } from "react";
import "./customer-form.css";

const FALLBACK_CUSTOMER_TYPES = [
  { label: "Contract", value: "contract" },
  { label: "Portal", value: "portal" },
];

const EMPTY_FORM = {
  customerBillingName: "",
  customerCode: "",
  shortName: "",
  longName: "",
  aliasName: "",
  customerType: "contract",
  addressLine1: "",
  addressLine2: "",
  city: "",
  country: "",
  postalCode: "",
  countryCode: "",
  status: "active",
};

const REQUIRED_FIELDS = [
  "customerBillingName",
  "customerCode",
  "addressLine1",
  "city",
  "country",
  "customerType",
  "status",
];

function FormField({ label, children, error, fullWidth = false }) {
  return (
    <div className={`field ${fullWidth ? "field--full" : ""}`}>
      <label className="field__label">{label}</label>
      {children}
      {error ? <div className="field__error">{error}</div> : null}
    </div>
  );
}

function validateForm(data) {
  const errors = {};

  REQUIRED_FIELDS.forEach((field) => {
    if (!String(data[field] ?? "").trim()) {
      errors[field] = "Field required";
    }
  });

  return errors;
}

export default function CustomerForm({ mode = "add", customerId, onClose, onSubmit }) {
  const isViewMode = mode === "view";
  const isEditMode = mode === "edit";
  const isAddMode = mode === "add";

  const [formData, setFormData] = useState(EMPTY_FORM);
  const [customerTypeOptions, setCustomerTypeOptions] = useState(FALLBACK_CUSTOMER_TYPES);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [submitted, setSubmitted] = useState(false);

  const title = useMemo(() => {
    if (isAddMode) return "Add Customer";
    if (isEditMode) return "Edit Customer";
    return "View Customer";
  }, [isAddMode, isEditMode]);

  const disabled = isViewMode || loading || saving;

  useEffect(() => {
    let ignore = false;

    const loadCustomerTypes = async () => {
      try {
        const res = await fetch("/api/customer-types");
        if (!res.ok) throw new Error("Failed to load customer types");

        const data = await res.json();
        const options = Array.isArray(data)
          ? data
          : Array.isArray(data?.data)
          ? data.data
          : [];

        if (!ignore && options.length > 0) {
          setCustomerTypeOptions(
            options.map((item) => ({
              label: item.label ?? item.name ?? String(item.value ?? item),
              value: item.value ?? item.code ?? String(item.label ?? item.name ?? item),
            }))
          );
        }
      } catch {
        if (!ignore) setCustomerTypeOptions(FALLBACK_CUSTOMER_TYPES);
      }
    };

    loadCustomerTypes();

    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    let ignore = false;

    const loadCustomer = async () => {
      if (isAddMode || !customerId) {
        setFormData(EMPTY_FORM);
        setErrors({});
        setSubmitted(false);
        return;
      }

      setLoading(true);
      try {
        const res = await fetch(`/api/customers/${customerId}`);
        if (!res.ok) throw new Error("Failed to load customer");

        const data = await res.json();
        const customer = data?.data ?? data;

        if (!ignore && customer) {
          setFormData({
            customerBillingName: customer.customerBillingName ?? "",
            customerCode: customer.customerCode ?? "",
            shortName: customer.shortName ?? "",
            longName: customer.longName ?? "",
            aliasName: customer.aliasName ?? "",
            customerType: customer.customerType ?? "contract",
            addressLine1: customer.addressLine1 ?? "",
            addressLine2: customer.addressLine2 ?? "",
            city: customer.city ?? "",
            country: customer.country ?? "",
            postalCode: customer.postalCode ?? "",
            countryCode: customer.countryCode ?? "",
            status: customer.status ?? "active",
          });
          setErrors({});
          setSubmitted(false);
        }
      } catch {
        if (!ignore) setFormData(EMPTY_FORM);
      } finally {
        if (!ignore) setLoading(false);
      }
    };

    loadCustomer();

    return () => {
      ignore = true;
    };
  }, [customerId, isAddMode]);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (submitted) {
      setErrors((prev) => {
        const next = { ...prev };
        if (String(value ?? "").trim()) {
          delete next[name];
        }
        return next;
      });
    }
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;

    if (!String(value ?? "").trim()) {
      setErrors((prev) => ({
        ...prev,
        [name]: "Field required",
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isViewMode) return;

    const nextErrors = validateForm(formData);
    setSubmitted(true);
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) return;

    setSaving(true);
    try {
      await onSubmit?.({
        ...formData,
        customerId: customerId ?? null,
        mode,
      });
    } finally {
      setSaving(false);
    }
  };

  const controlClass = (fieldName) =>
    `field__control ${errors[fieldName] ? "field__control--error" : ""}`;

  return (
    <form className="customer-form" onSubmit={handleSubmit} noValidate>
      <div className="customer-form__header">
        <h2 className="customer-form__title">{title}</h2>
      </div>

      {loading && <div className="customer-form__loading">Loading customer data...</div>}

      <section className="form-section">
        <h3>General Information</h3>
        <div className="form-grid">
          <FormField label="Customer Billing Name" error={errors.customerBillingName}>
            <input
              name="customerBillingName"
              value={formData.customerBillingName}
              onChange={handleChange}
              onBlur={handleBlur}
              disabled={disabled}
              className={controlClass("customerBillingName")}
              type="text"
            />
          </FormField>

          <FormField label="Customer Code" error={errors.customerCode}>
            <input
              name="customerCode"
              value={formData.customerCode}
              onChange={handleChange}
              onBlur={handleBlur}
              disabled={disabled}
              className={controlClass("customerCode")}
              type="text"
            />
          </FormField>

          <FormField label="Short Name">
            <input
              name="shortName"
              value={formData.shortName}
              onChange={handleChange}
              disabled={disabled}
              className="field__control"
              type="text"
            />
          </FormField>

          <FormField label="Long Name">
            <input
              name="longName"
              value={formData.longName}
              onChange={handleChange}
              disabled={disabled}
              className="field__control"
              type="text"
            />
          </FormField>

          <FormField label="Alias Name">
            <input
              name="aliasName"
              value={formData.aliasName}
              onChange={handleChange}
              disabled={disabled}
              className="field__control"
              type="text"
            />
          </FormField>

          <FormField label="Customer Type" error={errors.customerType}>
            <select
              name="customerType"
              value={formData.customerType}
              onChange={handleChange}
              onBlur={handleBlur}
              disabled={disabled}
              className={controlClass("customerType")}
            >
              <option value="">Select</option>
              {customerTypeOptions.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </FormField>
        </div>
      </section>

      <section className="form-section">
        <h3>Address Information</h3>
        <div className="form-grid">
          <div className="grid-row-break">
            <FormField label="Address Line 1" error={errors.addressLine1}>
              <input
                name="addressLine1"
                value={formData.addressLine1}
                onChange={handleChange}
                onBlur={handleBlur}
                disabled={disabled}
                className={controlClass("addressLine1")}
                type="text"
              />
            </FormField>

            <FormField label="Address Line 2">
              <input
                name="addressLine2"
                value={formData.addressLine2}
                onChange={handleChange}
                disabled={disabled}
                className="field__control"
                type="text"
              />
            </FormField>
          </div>

          <FormField label="City" error={errors.city}>
            <input
              name="city"
              value={formData.city}
              onChange={handleChange}
              onBlur={handleBlur}
              disabled={disabled}
              className={controlClass("city")}
              type="text"
            />
          </FormField>

          <FormField label="Country" error={errors.country}>
            <input
              name="country"
              value={formData.country}
              onChange={handleChange}
              onBlur={handleBlur}
              disabled={disabled}
              className={controlClass("country")}
              type="text"
            />
          </FormField>

          <FormField label="Postal Code">
            <input
              name="postalCode"
              value={formData.postalCode}
              onChange={handleChange}
              disabled={disabled}
              className="field__control"
              type="text"
            />
          </FormField>

          <FormField label="Country Code">
            <input
              name="countryCode"
              value={formData.countryCode}
              onChange={handleChange}
              disabled={disabled}
              className="field__control"
              type="text"
            />
          </FormField>
        </div>
      </section>

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
                onBlur={handleBlur}
                disabled={disabled}
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
                onBlur={handleBlur}
                disabled={disabled}
              />
              <span>Inactive</span>
            </label>
          </div>
          {errors.status ? <div className="field__error">{errors.status}</div> : null}
        </section>
      )}

      <div className="customer-form__actions">
        <button type="button" className="btn btn--secondary" onClick={onClose} disabled={saving}>
          Cancel
        </button>

        {!isViewMode && (
          <button type="submit" className="btn btn--primary" disabled={loading || saving}>
            {saving ? "Saving..." : "Save"}
          </button>
        )}
      </div>
    </form>
  );
}
