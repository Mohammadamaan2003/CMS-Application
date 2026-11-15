-- Starter Sample Data for CRM
-- Optional: Run this after schema.sql if you want sample records to test immediately.

INSERT INTO companies (name, website, phone, industry, address, notes)
VALUES
('Acme Innovations', 'https://acmeinnovations.example.com', '+1 (555) 234-5678', 'Technology', '100 Silicon Way, San Francisco, CA', 'Key enterprise account exploring new workflow integrations.'),
('Starlight Media', 'https://starlightmedia.example.com', '+1 (555) 876-5432', 'Marketing & Media', '450 Madison Ave, New York, NY', 'Creative agency specializing in brand design and advertising campaigns.'),
('GreenLeaf Solutions', 'https://greenleaf.example.com', '+1 (555) 432-1098', 'Renewable Energy', '78 Eco Park Dr, Austin, TX', 'Interested in sustainable cloud infrastructure.')
ON CONFLICT DO NOTHING;

INSERT INTO contacts (first_name, last_name, email, phone, job_title, notes, company_id)
VALUES
('Sarah', 'Connor', 'sarah.c@acmeinnovations.example.com', '+1 (555) 111-2233', 'Chief Technology Officer', 'Primary technical decision maker at Acme.', 1),
('Alex', 'Chen', 'alex.chen@acmeinnovations.example.com', '+1 (555) 222-3344', 'Lead Software Architect', 'Met at TechSummit 2026. Prefers email communication.', 1),
('Marcus', 'Vance', 'marcus@starlightmedia.example.com', '+1 (555) 333-4455', 'Creative Director', 'Overseeing cross-channel media rollouts.', 2),
('Elena', 'Rostova', 'elena@greenleaf.example.com', '+1 (555) 444-5566', 'Head of Sustainability', 'Looking for ESG reporting tools.', 3),
('Jordan', 'Taylor', 'jordan.taylor@independent.example.com', '+1 (555) 555-6677', 'Independent Consultant', 'Freelance advisor, currently not affiliated with any single company.', NULL)
ON CONFLICT DO NOTHING;

