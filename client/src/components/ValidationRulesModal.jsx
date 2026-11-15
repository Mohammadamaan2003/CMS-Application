import React from 'react';
import { IconClose } from './Icons';

export default function ValidationRulesModal({ isOpen, onClose, type = 'company' }) {
  if (!isOpen) return null;

  const isContact = type === 'contact';

  return (
    <div className="apex-modal-overlay" onClick={onClose}>
      <div className="apex-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="apex-modal-header">
          <div className="apex-modal-title">
            <span className="apex-info-badge">ⓘ</span>
            <h3>
              Customer Management System &bull; {isContact ? 'Contact' : 'Company'} Validation Rules
            </h3>
          </div>
          <button type="button" className="apex-close-btn" onClick={onClose}>
            <IconClose size={20} />
          </button>
        </div>

        <div className="apex-modal-body">
          {!isContact ? (
            <div className="rules-section">
              <h4>Company Upload & Database Validation Rules</h4>
              <ul className="rules-list">
                <li>
                  <strong>Company Name:</strong> Mandatory for all new company imports. Must be unique in the database in Insert mode; must exist in Update mode.
                </li>
                <li>
                  <strong>Company ID:</strong> Mandatory in Update mode to target the exact company record in the CRM database.
                </li>
                <li>
                  <strong>Website:</strong> Protected by unique check. Must be valid URL format (<code>https://domain.com</code>). In-file and database duplicates are rejected.
                </li>
                <li>
                  <strong>Corporate Email:</strong> Must conform to standard email format (<code>info@domain.com</code>). Checked for duplicates.
                </li>
                <li>
                  <strong>Master Lookups:</strong> <code>Employee Size</code>, <code>Technology</code>, <code>Industry</code>, <code>Company Type</code>, <code>Company Categories</code>, and <code>Country</code> are validated against CRM master tables. Unknown values are rejected.
                </li>
                <li>
                  <strong>Company Phone:</strong> Standard phone syntax with digits and optional country code (+).
                </li>
                <li>
                  <strong>Credentials Security:</strong> Usernames and passwords are excluded from import templates and error reports to protect account credentials.
                </li>
              </ul>
            </div>
          ) : (
            <div className="rules-section">
              <h4>Contact Upload & Database Validation Rules</h4>
              <ul className="rules-list">
                <li>
                  <strong>Contact Name:</strong> Mandatory. Full name of the contact person.
                </li>
                <li>
                  <strong>Company Linking:</strong> Contact must link to a valid Company in the CRM database by <code>Company Name</code> or <code>Company ID</code>. If both are provided, they must match the same company.
                </li>
                <li>
                  <strong>Contact ID:</strong> Mandatory in Update mode to identify the existing contact record.
                </li>
                <li>
                  <strong>Corporate Email:</strong> Primary business email for CRM correspondence. Checked for valid format and duplicates in the database.
                </li>
                <li>
                  <strong>LinkedIn URL:</strong> Must be a valid profile URL (<code>https://www.linkedin.com/in/...</code>). Duplicates in the database are rejected.
                </li>
                <li>
                  <strong>Position Type & Designation:</strong> Validated against Position Type and Designation master tables.
                </li>
                <li>
                  <strong>Salesperson & Source:</strong> Validated against CRM master tables.
                </li>
                <li>
                  <strong>Phone & Mobile:</strong> Standard numeric format with optional country code.
                </li>
              </ul>
            </div>
          )}
        </div>

        <div className="apex-modal-footer">
          <button type="button" className="btn-apex-primary" onClick={onClose}>
            Understood & Close
          </button>
        </div>
      </div>
    </div>
  );
}

export function CompanyValidationRulesModal({ isOpen, onClose }) {
  return <ValidationRulesModal isOpen={isOpen} onClose={onClose} type="company" />;
}

export function ContactValidationRulesModal({ isOpen, onClose }) {
  return <ValidationRulesModal isOpen={isOpen} onClose={onClose} type="contact" />;
}
