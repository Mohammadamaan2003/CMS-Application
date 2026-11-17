import React, { useState, useEffect } from 'react';
import Modal from '../../components/Modal';

// Email regex pattern for validation
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ContactFormModal({
  isOpen,
  onClose,
  onSubmit,
  contactToEdit = null,
  companies = [],
  defaultCompanyId = '',
  isLoading = false,
}) {
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    job_title: '',
    notes: '',
    company_id: '',
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (contactToEdit) {
      setFormData({
        first_name: contactToEdit.first_name || '',
        last_name: contactToEdit.last_name || '',
        email: contactToEdit.email || '',
        phone: contactToEdit.phone || '',
        job_title: contactToEdit.job_title || '',
        notes: contactToEdit.notes || '',
        company_id: contactToEdit.company_id ? String(contactToEdit.company_id) : '',
      });
    } else {
      setFormData({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        job_title: '',
        notes: '',
        company_id: defaultCompanyId ? String(defaultCompanyId) : '',
      });
    }
    setErrors({});
  }, [contactToEdit, defaultCompanyId, isOpen]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.first_name.trim()) {
      newErrors.first_name = 'First name is required.';
    }

    if (!formData.last_name.trim()) {
      newErrors.last_name = 'Last name is required.';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email address is required.';
    } else if (!EMAIL_REGEX.test(formData.email.trim())) {
      newErrors.email = 'Please enter a valid email address (e.g. name@domain.com).';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;

    const payload = {
      ...formData,
      company_id: formData.company_id ? parseInt(formData.company_id, 10) : null,
    };

    onSubmit(payload);
  };

  const isEditMode = Boolean(contactToEdit);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditMode ? 'Edit Contact' : 'Add New Contact'}
      maxWidth="580px"
    >
      <form onSubmit={handleSubmit}>
        <div className="modal-body">
          {/* First & Last Name */}
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">
                First Name <span className="required">*</span>
              </label>
              <input
                type="text"
                name="first_name"
                className={`form-input ${errors.first_name ? 'error' : ''}`}
                placeholder="e.g. Sarah"
                value={formData.first_name}
                onChange={handleChange}
                autoFocus
              />
              {errors.first_name && <div className="field-error">{errors.first_name}</div>}
            </div>

            <div className="form-group">
              <label className="form-label">
                Last Name <span className="required">*</span>
              </label>
              <input
                type="text"
                name="last_name"
                className={`form-input ${errors.last_name ? 'error' : ''}`}
                placeholder="e.g. Connor"
                value={formData.last_name}
                onChange={handleChange}
              />
              {errors.last_name && <div className="field-error">{errors.last_name}</div>}
            </div>
          </div>

          {/* Email & Phone */}
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">
                Email Address <span className="required">*</span>
              </label>
              <input
                type="email"
                name="email"
                className={`form-input ${errors.email ? 'error' : ''}`}
                placeholder="sarah@example.com"
                value={formData.email}
                onChange={handleChange}
              />
              {errors.email && <div className="field-error">{errors.email}</div>}
            </div>

            <div className="form-group">
              <label className="form-label">Phone Number</label>
              <input
                type="text"
                name="phone"
                className="form-input"
                placeholder="+1 (555) 000-0000"
                value={formData.phone}
                onChange={handleChange}
              />
            </div>
          </div>

          {/* Job Title & Linked Company */}
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Job Title</label>
              <input
                type="text"
                name="job_title"
                className="form-input"
                placeholder="e.g. Chief Technology Officer"
                value={formData.job_title}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Linked Company</label>
              <select
                name="company_id"
                className="form-select"
                value={formData.company_id}
                onChange={handleChange}
              >
                <option value="">None / Unassigned</option>
                {companies.map((comp) => (
                  <option key={comp.id} value={comp.id}>
                    {comp.name}
                  </option>
                ))}
              </select>
              <div className="form-help">Optionally link this contact to one company</div>
            </div>
          </div>

          {/* Notes */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Notes</label>
            <textarea
              name="notes"
              rows="3"
              className="form-textarea"
              placeholder="Background, conversation notes, or preferred contact times..."
              value={formData.notes}
              onChange={handleChange}
            />
          </div>
        </div>

        <div className="modal-footer">
          <button
            type="button"
            className="btn btn-secondary btn-apex-cancel"
            onClick={onClose}
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn btn-primary btn-apex-create"
            disabled={isLoading}
          >
            {isLoading
              ? 'Saving...'
              : isEditMode
              ? 'Update Contact'
              : 'Create Contact'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

