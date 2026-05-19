
import React, { useEffect, useMemo, useState } from "react";
import "./CustomerForm.css";

const EMPTY_FORM = {
  customerBillingName: "",
  customerCode: "",
  shortName: "",
  longName: "",
  aliasName: "",
  customerTypeId: "",
  addressLine1: "",
  addressLine2: "",
  city: "",
  country: "",
  postalCode: "",
  countryCode: "",
  telephone: "",
  email: "",
  website: "",
  status: "active",
};

const REQUIRED_FIELDS = [
  "customerBillingName",
  "customerCode",
  "addressLine1",
  "city",
  "country",
  "customerTypeId",
  "status",
];

function FormField({ label, children, error, hint, fullWidth = false }) {
  return (
    <div className={`field ${fullWidth ? "field--full" : ""}`}>
      <label className="field__label">{label}</label>
      {children}
      {hint ? <div className="field__hint">{hint}</div> : null}
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

export default function CustomerForm({
  mode = "add",
  initialValues = null,
  customerTypeOptions = [],
  customerTypeLoading = false,
  customerTypeError = "",
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
      status: initialValues?.status || "active",
    };
  }, [initialValues]);

  const [formData, setFormData] = useState(mergedInitialValues);
  const [errors, setErrors] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setFormData(mergedInitialValues);
    setErrors({});
    setSubmitted(false);
  }, [mergedInitialValues]);

  const selectedCustomerType = useMemo(() => {
    return customerTypeOptions.find(
      (opt) => String(opt.customerTypeId) === String(formData.customerTypeId)
    );
  }, [customerTypeOptions, formData.customerTypeId]);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (submitted && errors[name]) {
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

  const buildPayload = (data) => {
    const basePayload = {
      customerBillingName: data.customerBillingName.trim(),
      customerCode: data.customerCode.trim(),
      shortName: data.shortName?.trim() || "",
      longName: data.longName?.trim() || "",
      aliasName: data.aliasName?.trim() || "",
      customerTypeId: data.customerTypeId,
      customerType: selectedCustomerType?.customerType ?? "",
      customerTypeDescription: selectedCustomerType?.customerTypeDescription ?? "",
      addressLine1: data.addressLine1.trim(),
      addressLine2: data.addressLine2?.trim() || "",
      city: data.city.trim(),
      country: data.country.trim(),
      postalCode: data.postalCode?.trim() || "",
      countryCode: data.countryCode?.trim() || "",
      telephone: data.telephone?.trim() || "",
      email: data.email?.trim() || "",
      website: data.website?.trim() || "",
      isActive: data.status === "active",
      status: data.status,
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

    const nextErrors = validateForm(formData);
    setSubmitted(true);
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) return;

    setSaving(true);
    try {
      const payload = buildPayload(formData);
      await onSubmit?.(payload);
    } finally {
      setSaving(false);
    }
  };

  const controlClass = (fieldName) =>
    `field__control ${errors[fieldName] ? "field__control--error" : ""}`;

  return (
    <form className="customer-form" onSubmit={handleSubmit} noValidate>
      <section className="form-section">
        <h3>General Information</h3>
        <div className="form-grid">
          <FormField label="Customer Billing Name" error={errors.customerBillingName}>
            <input
              name="customerBillingName"
              value={formData.customerBillingName}
              onChange={handleChange}
              onBlur={handleBlur}
              disabled={isViewMode}
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
              disabled={isViewMode}
              className={controlClass("customerCode")}
              type="text"
            />
          </FormField>

          <FormField label="Short Name">
            <input
              name="shortName"
              value={formData.shortName}
              onChange={handleChange}
              disabled={isViewMode}
              className="field__control"
              type="text"
            />
          </FormField>

          <FormField label="Long Name">
            <input
              name="longName"
              value={formData.longName}
              onChange={handleChange}
              disabled={isViewMode}
              className="field__control"
              type="text"
            />
          </FormField>

          <FormField label="Alias Name">
            <input
              name="aliasName"
              value={formData.aliasName}
              onChange={handleChange}
              disabled={isViewMode}
              className="field__control"
              type="text"
            />
          </FormField>

          <FormField
            label="Customer Type"
            error={errors.customerTypeId}
            hint={selectedCustomerType?.customerTypeDescription || ""}
          >
            <select
              name="customerTypeId"
              value={formData.customerTypeId}
              onChange={handleChange}
              onBlur={handleBlur}
              disabled={isViewMode || customerTypeLoading}
              className={controlClass("customerTypeId")}
              title={selectedCustomerType?.customerTypeDescription || ""}
            >
              <option value="">Select</option>
              {customerTypeOptions.map((item) => (
                <option
                  key={item.customerTypeId}
                  value={item.customerTypeId}
                  title={item.customerTypeDescription || ""}
                >
                  {item.customerType}
                </option>
              ))}
            </select>
          </FormField>
        </div>

        {customerTypeError ? <div className="customer-form__banner">{customerTypeError}</div> : null}
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
                disabled={isViewMode}
                className={controlClass("addressLine1")}
                type="text"
              />
            </FormField>

            <FormField label="Address Line 2">
              <input
                name="addressLine2"
                value={formData.addressLine2}
                onChange={handleChange}
                disabled={isViewMode}
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
              disabled={isViewMode}
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
              disabled={isViewMode}
              className={controlClass("country")}
              type="text"
            />
          </FormField>

          <FormField label="Postal Code">
            <input
              name="postalCode"
              value={formData.postalCode}
              onChange={handleChange}
              disabled={isViewMode}
              className="field__control"
              type="text"
            />
          </FormField>

          <FormField label="Country Code">
            <input
              name="countryCode"
              value={formData.countryCode}
              onChange={handleChange}
              disabled={isViewMode}
              className="field__control"
              type="text"
            />
          </FormField>

          <FormField label="Telephone">
            <input
              name="telephone"
              value={formData.telephone}
              onChange={handleChange}
              disabled={isViewMode}
              className="field__control"
              type="text"
            />
          </FormField>

          <FormField label="Email">
            <input
              name="email"
              value={formData.email}
              onChange={handleChange}
              disabled={isViewMode}
              className="field__control"
              type="email"
            />
          </FormField>

          <FormField label="Website">
            <input
              name="website"
              value={formData.website}
              onChange={handleChange}
              disabled={isViewMode}
              className="field__control"
              type="url"
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
                onBlur={handleBlur}
                disabled={isViewMode}
              />
              <span>Inactive</span>
            </label>
          </div>
          {errors.status ? <div className="field__error">{errors.status}</div> : null}
        </section>
      )}

      <div className="customer-form__actions">
        <button type="button" className="btn btn--secondary" onClick={onCancel} disabled={saving}>
          Cancel
        </button>

        {!isViewMode && (
          <button type="submit" className="btn btn--primary" disabled={saving || customerTypeLoading}>
            {saving ? "Saving..." : "Save"}
          </button>
        )}
      </div>
    </form>
  );
}





import React, { useEffect, useMemo, useState } from "react";
import Modal from "./Modal";
import CustomerForm from "./CustomerForm";
import { getCustomerById, fetchCustomerTypes } from "../../services/CustomerApi";

const FALLBACK_CUSTOMER_TYPES = [
  {
    customerTypeId: "contract",
    customerType: "Contract",
    customerTypeDescription: "Contract-based customer",
  },
  {
    customerTypeId: "portal",
    customerType: "Portal",
    customerTypeDescription: "Portal-based customer",
  },
];

function normalizeCustomerTypeOptions(apiBody) {
  const raw = Array.isArray(apiBody)
    ? apiBody
    : Array.isArray(apiBody?.data)
      ? apiBody.data
      : Array.isArray(apiBody?.customerTypes)
        ? apiBody.customerTypes
        : [];

  if (!Array.isArray(raw)) return [];

  return raw
    .map((item) => ({
      customerTypeId:
        item.customerTypeId ??
        item.id ??
        item.typeId ??
        item.value ??
        item.customer_type_id ??
        "",
      customerType:
        item.customerType ??
        item.type ??
        item.name ??
        item.label ??
        String(item.value ?? item.id ?? ""),
      customerTypeDescription:
        item.customerTypeDescription ??
        item.description ??
        item.tooltip ??
        "",
    }))
    .filter(
      (item) =>
        String(item.customerTypeId).trim() && String(item.customerType).trim()
    );
}

function mapCustomerApiToForm(api) {
  if (!api || typeof api !== "object") return null;

  return {
    customerBillingName: api.customerBillingName ?? api.customerName ?? "",
    customerCode: api.customerCode ?? "",
    shortName: api.shortName ?? "",
    longName: api.longName ?? "",
    aliasName: api.aliasName ?? "",
    customerTypeId:
      api.customerTypeId ??
      api.customerType?.customerTypeId ??
      api.customerType?.id ??
      api.customerType?.value ??
      "",
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
      (typeof api.isActive === "boolean"
        ? api.isActive
          ? "active"
          : "inactive"
        : "active"),
  };
}

export default function CustomerFormModal({
  isOpen,
  mode = "add",
  customerId,
  onClose,
  onSubmit,
  auditUser = "system",
}) {
  const [initialValues, setInitialValues] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadErr, setLoadErr] = useState("");

  const [customerTypeOptions, setCustomerTypeOptions] = useState([]);
  const [customerTypeLoading, setCustomerTypeLoading] = useState(false);
  const [customerTypeError, setCustomerTypeError] = useState("");

  const title = useMemo(() => {
    if (mode === "view") return "View Customer";
    if (mode === "edit") return "Edit Customer";
    return "Add Customer";
  }, [mode]);

  useEffect(() => {
    let cancelled = false;

    async function loadCustomerTypes() {
      try {
        setCustomerTypeLoading(true);
        setCustomerTypeError("");

        const body = await fetchCustomerTypes();
        const normalized = normalizeCustomerTypeOptions(body);

        if (!cancelled) {
          setCustomerTypeOptions(
            normalized.length > 0 ? normalized : FALLBACK_CUSTOMER_TYPES
          );
        }
      } catch (err) {
        if (!cancelled) {
          setCustomerTypeError("Failed to load customer types. Using defaults.");
          setCustomerTypeOptions(FALLBACK_CUSTOMER_TYPES);
        }
      } finally {
        if (!cancelled) setCustomerTypeLoading(false);
      }
    }

    if (isOpen) {
      loadCustomerTypes();
    } else {
      setInitialValues(null);
      setLoadErr("");
      setLoading(false);
    }

    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  useEffect(() => {
    let ignore = false;

    async function load() {
      if (!isOpen) {
        setInitialValues(null);
        setLoadErr("");
        setLoading(false);
        return;
      }

      if (mode === "add") {
        setInitialValues({
          customerBillingName: "",
          customerCode: "",
          shortName: "",
          longName: "",
          aliasName: "",
          customerTypeId: customerTypeOptions[0]?.customerTypeId || "",
          addressLine1: "",
          addressLine2: "",
          city: "",
          country: "",
          postalCode: "",
          countryCode: "",
          telephone: "",
          email: "",
          website: "",
          status: "active",
        });
        setLoadErr("");
        return;
      }

      if (!customerId) {
        setLoadErr("Missing customer id");
        return;
      }

      try {
        setLoading(true);
        setLoadErr("");

        const data = await getCustomerById(customerId);
        const mapped = mapCustomerApiToForm(data);

        if (!ignore) {
          setInitialValues(mapped);
        }
      } catch (err) {
        if (!ignore) {
          setLoadErr(err?.message || "Failed to load customer");
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    load();

    return () => {
      ignore = true;
    };
  }, [isOpen, mode, customerId, customerTypeOptions]);

  const handleCancel = () => {
    onClose?.();
  };

  return (
    <Modal title={title} isOpen={isOpen} onClose={onClose}>
      {loading && <div className="muted">Loading...</div>}

      {loadErr ? (
        <div className="error" style={{ marginBottom: 8 }}>
          {loadErr}
        </div>
      ) : null}

      {!loading && !loadErr && (
        <CustomerForm
          key={`${mode}-${customerId || "new"}`}
          initialValues={initialValues}
          mode={mode}
          onCancel={handleCancel}
          onSubmit={onSubmit}
          customerTypeOptions={customerTypeOptions}
          customerTypeLoading={customerTypeLoading}
          customerTypeError={customerTypeError}
          auditUser={auditUser}
        />
      )}
    </Modal>
  );
}
