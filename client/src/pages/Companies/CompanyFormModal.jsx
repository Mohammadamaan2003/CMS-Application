import React, { useState, useEffect } from 'react';
import Modal from '../../components/Modal';

export default function CompanyFormModal({
  isOpen,
  onClose,
  onSubmit,
  companyToEdit = null,
  isLoading = false,
}) {
  const [formData, setFormData] = useState({
    name: '',
    website: '',
    phone: '',
    industry: '',
    address: '',
    notes: '',
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (companyToEdit) {
      setFormData({
        name: companyToEdit.name || '',
        website: companyToEdit.website || '',
        phone: companyToEdit.phone || '',
        industry: companyToEdit.industry || '',
        address: companyToEdit.address || '',
        notes: companyToEdit.notes || '',
      });
    } else {
      setFormData({
        name: '',
        website: '',
        phone: '',
        industry: '',
        address: '',
        notes: '',
      });
    }
    setErrors({});
  }, [companyToEdit, isOpen]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.name.trim()) {
      newErrors.name = 'Company name is required.';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    onSubmit(formData);
  };

  const isEditMode = Boolean(companyToEdit);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditMode ? 'Edit Company' : 'Add New Company'}
      maxWidth="580px"
    >
      <form onSubmit={handleSubmit}>
        <div className="modal-body">
          {/* Company Name */}
          <div className="form-group">
            <label className="form-label">
              Company Name <span className="required">*</span>
            </label>
            <input
              type="text"
              name="name"
              className={`form-input ${errors.name ? 'error' : ''}`}
              placeholder="e.g. Acme Innovations"
              value={formData.name}
              onChange={handleChange}
              autoFocus
            />
            {errors.name && <div className="field-error">{errors.name}</div>}
          </div>

          <div className="form-row">
            {/* Industry */}
            <div className="form-group">
              <label className="form-label">Industry</label>
              <input
                type="text"
                name="industry"
                className="form-input"
                placeholder="e.g. Technology, Healthcare"
                value={formData.industry}
                onChange={handleChange}
              />
            </div>

            {/* Phone */}
            <div className="form-group">
              <label className="form-label">Phone</label>
              <input
                type="text"
                name="phone"
                className="form-input"
                placeholder="e.g. +1 (555) 000-0000"
                value={formData.phone}
                onChange={handleChange}
              />
            </div>
          </div>

          {/* Website */}
          <div className="form-group">
            <label className="form-label">Website</label>
            <input
              type="url"
              name="website"
              className="form-input"
              placeholder="https://example.com"
              value={formData.website}
              onChange={handleChange}
            />
            <div className="form-help">Enter a complete web address including http:// or https://</div>
          </div>

          {/* Address */}
          <div className="form-group">
            <label className="form-label">Address</label>
            <input
              type="text"
              name="address"
              className="form-input"
              placeholder="Street, City, State, ZIP"
              value={formData.address}
              onChange={handleChange}
            />
          </div>

          {/* Notes */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Notes</label>
            <textarea
              name="notes"
              rows="3"
              className="form-textarea"
              placeholder="Key account details, customer preferences, or notes..."
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
              ? 'Update Company'
              : 'Create Company'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

