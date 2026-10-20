
import { useState } from "react";
import {
  Settings as SettingsIcon,
  UserRound,
  Store,
  Bell,
  ShieldCheck,
  Save,
  RotateCcw,
  Mail,
  Phone,
  MapPin,
  Eye,
  EyeOff,
  CheckCircle2,
} from "lucide-react";
import "./Settings.css";

const defaultSettings = {
  fullName: "Café Administrator",
  email: "admin@justwokup.com",
  phone: "",
  role: "Administrator",
  cafeName: "Just Wok Up Café",
  address: "",
  currency: "PHP",
  emailNotifications: true,
  orderNotifications: true,
  lowStockNotifications: true,
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
};

export default function Settings() {
  const [settings, setSettings] = useState(defaultSettings);
  const [activeTab, setActiveTab] = useState("profile");
  const [message, setMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const updateSetting = (key, value) => {
    setSettings((prev) => ({
      ...prev,
      [key]: value,
    }));
    setMessage("");
  };

  const handleSave = (event) => {
    event.preventDefault();

    if (
      settings.newPassword &&
      settings.newPassword !== settings.confirmPassword
    ) {
      setMessage("New password and confirmation do not match.");
      return;
    }

    if (
      settings.newPassword &&
      (!settings.currentPassword ||
        settings.newPassword.length < 8)
    ) {
      setMessage(
        "Enter your current password and use at least 8 characters for the new password."
      );
      return;
    }

    // Frontend demonstration only.
    // Connect this handler to your backend to save settings permanently.
    setMessage(
      "Settings validated. Connect the backend to save changes permanently."
    );
  };

  const handleReset = () => {
    setSettings(defaultSettings);
    setMessage("");
  };

  const tabs = [
    { id: "profile", label: "My Profile", icon: UserRound },
    { id: "cafe", label: "Café Information", icon: Store },
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "security", label: "Security", icon: ShieldCheck },
  ];

  const Toggle = ({ label, description, checked, onChange }) => (
    <div className="settings-toggle-row">
      <div className="settings-toggle-copy">
        <strong>{label}</strong>
        <p>{description}</p>
      </div>

      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        className={`settings-switch ${checked ? "is-on" : ""}`}
        onClick={() => onChange(!checked)}
      >
        <span />
      </button>
    </div>
  );

  return (
    <main className="cafe-settings">
      <header className="settings-page-heading">
        <div>
          <div className="settings-eyebrow">
            <SettingsIcon size={15} />
            ACCOUNT & PREFERENCES
          </div>

          <h1>Settings</h1>
          <p>
            Manage your account, café information, and workspace
            preferences.
          </p>
        </div>

        <div className="settings-heading-icon">
          <SettingsIcon size={27} />
        </div>
      </header>

      <div className="settings-notice">
        <span className="settings-notice-dot" />
        <span>
          Changes currently apply to this page only. Backend integration
          is needed to save them permanently.
        </span>
      </div>

      <div className="settings-layout">
        <aside className="settings-sidebar">
          <div className="settings-sidebar-title">GENERAL SETTINGS</div>

          {tabs.map((tab) => {
            const Icon = tab.icon;

            return (
              <button
                type="button"
                key={tab.id}
                className={`settings-tab ${
                  activeTab === tab.id ? "active" : ""
                }`}
                onClick={() => {
                  setActiveTab(tab.id);
                  setMessage("");
                }}
              >
                <Icon size={18} />
                <span>{tab.label}</span>
              </button>
            );
          })}

          <div className="settings-sidebar-footer">
            <div className="settings-avatar">
              <UserRound size={20} />
            </div>
            <div>
              <strong>{settings.fullName || "Administrator"}</strong>
              <span>{settings.role}</span>
            </div>
          </div>
        </aside>

        <form className="settings-content" onSubmit={handleSave}>
          {activeTab === "profile" && (
            <section>
              <div className="settings-section-heading">
                <div className="settings-section-icon">
                  <UserRound size={20} />
                </div>
                <div>
                  <h2>My Profile</h2>
                  <p>Update your personal and contact information.</p>
                </div>
              </div>

              <div className="settings-profile-banner">
                <div className="settings-profile-avatar">
                  <UserRound size={30} />
                </div>
                <div>
                  <h3>{settings.fullName || "Your Name"}</h3>
                  <p>{settings.email || "Your email address"}</p>
                  <span>{settings.role}</span>
                </div>
              </div>

              <div className="settings-form-grid">
                <label className="settings-field">
                  <span>Full Name</span>
                  <input
                    value={settings.fullName}
                    onChange={(e) =>
                      updateSetting("fullName", e.target.value)
                    }
                    placeholder="Enter your full name"
                    required
                  />
                </label>

                <label className="settings-field">
                  <span>Role</span>
                  <input value={settings.role} readOnly />
                  <small>Managed by the system administrator.</small>
                </label>

                <label className="settings-field">
                  <span>Email Address</span>
                  <div className="settings-input-icon">
                    <Mail size={17} />
                    <input
                      type="email"
                      value={settings.email}
                      onChange={(e) =>
                        updateSetting("email", e.target.value)
                      }
                      placeholder="name@example.com"
                      required
                    />
                  </div>
                </label>

                <label className="settings-field">
                  <span>Phone Number</span>
                  <div className="settings-input-icon">
                    <Phone size={17} />
                    <input
                      type="tel"
                      value={settings.phone}
                      onChange={(e) =>
                        updateSetting("phone", e.target.value)
                      }
                      placeholder="Enter phone number"
                    />
                  </div>
                </label>
              </div>
            </section>
          )}

          {activeTab === "cafe" && (
            <section>
              <div className="settings-section-heading">
                <div className="settings-section-icon">
                  <Store size={20} />
                </div>
                <div>
                  <h2>Café Information</h2>
                  <p>Manage the basic information of your café.</p>
                </div>
              </div>

              <div className="settings-cafe-banner">
                <div className="settings-cafe-icon">
                  <Store size={27} />
                </div>
                <div>
                  <span>YOUR BUSINESS</span>
                  <h3>{settings.cafeName || "Your Café Name"}</h3>
                  <p>Staff workspace information</p>
                </div>
              </div>

              <div className="settings-form-grid">
                <label className="settings-field full-width">
                  <span>Café Name</span>
                  <input
                    value={settings.cafeName}
                    onChange={(e) =>
                      updateSetting("cafeName", e.target.value)
                    }
                    placeholder="Enter café name"
                    required
                  />
                </label>

                <label className="settings-field full-width">
                  <span>Business Address</span>
                  <div className="settings-input-icon">
                    <MapPin size={17} />
                    <input
                      value={settings.address}
                      onChange={(e) =>
                        updateSetting("address", e.target.value)
                      }
                      placeholder="Enter café address"
                    />
                  </div>
                </label>

                <label className="settings-field full-width">
                  <span>Currency</span>
                  <select
                    value={settings.currency}
                    onChange={(e) =>
                      updateSetting("currency", e.target.value)
                    }
                  >
                    <option value="PHP">PHP — Philippine Peso (₱)</option>
                    <option value="USD">USD — US Dollar ($)</option>
                  </select>
                  <small>
                    This is a display preference and does not convert
                    existing transaction amounts.
                  </small>
                </label>
              </div>
            </section>
          )}

          {activeTab === "notifications" && (
            <section>
              <div className="settings-section-heading">
                <div className="settings-section-icon">
                  <Bell size={20} />
                </div>
                <div>
                  <h2>Notifications</h2>
                  <p>Choose which updates you want to receive.</p>
                </div>
              </div>

              <div className="settings-preference-card">
                <div className="settings-preference-title">
                  <Mail size={19} />
                  <div>
                    <h3>Email Notifications</h3>
                    <p>General updates and account information.</p>
                  </div>
                </div>

                <Toggle
                  label="Email updates"
                  description="Receive important updates by email."
                  checked={settings.emailNotifications}
                  onChange={(value) =>
                    updateSetting("emailNotifications", value)
                  }
                />
              </div>

              <div className="settings-preference-card">
                <div className="settings-preference-title">
                  <Bell size={19} />
                  <div>
                    <h3>Order Notifications</h3>
                    <p>Stay updated about café orders.</p>
                  </div>
                </div>

                <Toggle
                  label="New and updated orders"
                  description="Get notified when an order is placed or updated."
                  checked={settings.orderNotifications}
                  onChange={(value) =>
                    updateSetting("orderNotifications", value)
                  }
                />
              </div>

              <div className="settings-preference-card">
                <div className="settings-preference-title">
                  <Store size={19} />
                  <div>
                    <h3>Inventory Notifications</h3>
                    <p>Keep track of ingredients and supplies.</p>
                  </div>
                </div>

                <Toggle
                  label="Low-stock alerts"
                  description="Receive an alert when an item needs restocking."
                  checked={settings.lowStockNotifications}
                  onChange={(value) =>
                    updateSetting("lowStockNotifications", value)
                  }
                />
              </div>
            </section>
          )}

          {activeTab === "security" && (
            <section>
              <div className="settings-section-heading">
                <div className="settings-section-icon">
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <h2>Security</h2>
                  <p>Change your password to help protect your account.</p>
                </div>
              </div>

              <div className="settings-security-note">
                <ShieldCheck size={22} />
                <div>
                  <strong>Keep your account secure</strong>
                  <p>
                    Use a unique password with at least 8 characters.
                    Password changes require backend authentication.
                  </p>
                </div>
              </div>

              <div className="settings-form-grid">
                <label className="settings-field full-width">
                  <span>Current Password</span>
                  <input
                    type="password"
                    autoComplete="current-password"
                    value={settings.currentPassword}
                    onChange={(e) =>
                      updateSetting("currentPassword", e.target.value)
                    }
                    placeholder="Enter current password"
                  />
                </label>

                <label className="settings-field">
                  <span>New Password</span>
                  <div className="settings-input-icon">
                    <input
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      value={settings.newPassword}
                      onChange={(e) =>
                        updateSetting("newPassword", e.target.value)
                      }
                      placeholder="At least 8 characters"
                    />
                    <button
                      type="button"
                      className="settings-eye-button"
                      aria-label={
                        showPassword ? "Hide password" : "Show password"
                      }
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff size={17} />
                      ) : (
                        <Eye size={17} />
                      )}
                    </button>
                  </div>
                </label>

                <label className="settings-field">
                  <span>Confirm New Password</span>
                  <input
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    value={settings.confirmPassword}
                    onChange={(e) =>
                      updateSetting("confirmPassword", e.target.value)
                    }
                    placeholder="Re-enter new password"
                  />
                </label>
              </div>
            </section>
          )}

          {message && (
            <div
              className={`settings-message ${
                message.startsWith("Settings validated")
                  ? "settings-message-info"
                  : "settings-message-error"
              }`}
              role="status"
            >
              {message.startsWith("Settings validated") && (
                <CheckCircle2 size={18} />
              )}
              <span>{message}</span>
            </div>
          )}

          <div className="settings-actions">
            <button
              type="button"
              className="settings-reset-button"
              onClick={handleReset}
            >
              <RotateCcw size={16} />
              Reset
            </button>

            <button type="submit" className="settings-save-button">
              <Save size={17} />
              Save Changes
            </button>
          </div>
        </form>
      </div>

      <footer className="settings-page-footer">
        <ShieldCheck size={15} />
        Just Wok Up Café · Staff Workspace Settings
      </footer>
    </main>
  );
}
