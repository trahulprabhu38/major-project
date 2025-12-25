import { useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  User,
  Mail,
  Lock,
  Building2,
  Bell,
  Moon,
  Sun,
  Save,
  Camera
} from "lucide-react";
import toast from "react-hot-toast";

const Settings = () => {
  const { user, updateProfile } = useAuth();
  const { isDark, toggleTheme } = useTheme();

  // Form states
  const [formData, setFormData] = useState({
    name: user?.name || "",
    email: user?.email || "",
    department: user?.department || "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  // Preference states
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [loading, setLoading] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSaveChanges = async () => {
    setLoading(true);

    // Validate password fields if changing password
    if (formData.newPassword) {
      if (formData.newPassword !== formData.confirmPassword) {
        toast.error("Passwords do not match!");
        setLoading(false);
        return;
      }
      if (formData.newPassword.length < 6) {
        toast.error("Password must be at least 6 characters!");
        setLoading(false);
        return;
      }
    }

    // Simulate API call
    setTimeout(() => {
      toast.success("Settings saved successfully!");
      setLoading(false);
      // Clear password fields
      setFormData(prev => ({
        ...prev,
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      }));
    }, 1000);
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6, ease: "easeOut" },
    },
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
      className={`min-h-screen p-6 transition-colors duration-700 ${
        isDark
          ? 'bg-dark-bg-primary'
          : 'bg-neutral-100'
      }`}
    >
      <motion.div
        initial="hidden"
        animate="visible"
        variants={containerVariants}
        className="max-w-5xl mx-auto space-y-6"
      >
        {/* Header */}
        <motion.div variants={itemVariants} className="mb-8">
          <h1 className={`text-4xl font-bold bg-gradient-to-r ${
            isDark
              ? 'from-dark-green-500 to-secondary-600'
              : 'from-primary-500 to-secondary-500'
          } bg-clip-text text-transparent`}>
            Account Settings
          </h1>
          <p className={`mt-2 ${isDark ? 'text-dark-text-secondary' : 'text-neutral-600'}`}>
            Manage your account settings and preferences
          </p>
        </motion.div>

        {/* Profile Card */}
        <motion.div variants={itemVariants}>
          <Card className="hover:shadow-md border-2 border-neutral-200 dark:border-dark-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-neutral-800 dark:text-dark-text-primary">
                <User className="w-5 h-5 text-primary-600 dark:text-dark-green-500" />
                Profile Information
              </CardTitle>
              <CardDescription>
                Update your personal information and profile details
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Avatar Section */}
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-r from-primary-500 to-secondary-500 dark:from-dark-green-500 dark:to-secondary-600 flex items-center justify-center text-white text-2xl font-bold">
                    {user?.name?.charAt(0).toUpperCase()}
                  </div>
                  <button className="absolute bottom-0 right-0 p-1.5 bg-white dark:bg-dark-bg-secondary rounded-full shadow-md hover:shadow-lg transition-shadow border-2 border-neutral-200 dark:border-dark-border">
                    <Camera className="w-4 h-4 text-neutral-600 dark:text-dark-text-secondary" />
                  </button>
                </div>
                <div>
                  <p className="font-semibold text-lg text-neutral-800 dark:text-dark-text-primary">{user?.name}</p>
                  <p className="text-sm text-neutral-600 dark:text-dark-text-secondary capitalize">{user?.role}</p>
                </div>
              </div>

              {/* Form Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className="flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Full Name
                  </Label>
                  <Input
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="John Doe"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    Email Address
                  </Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="john@example.com"
                    disabled
                    className="bg-neutral-50 dark:bg-dark-bg-tertiary"
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="department" className="flex items-center gap-2">
                    <Building2 className="w-4 h-4" />
                    {user?.role === "teacher" ? "Department" : "Branch"}
                  </Label>
                  <Input
                    id="department"
                    name="department"
                    value={formData.department}
                    onChange={handleInputChange}
                    placeholder={user?.role === "teacher" ? "Computer Science" : "CSE - AI & ML"}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Password Card */}
        <motion.div variants={itemVariants}>
          <Card className="hover:shadow-md border-2 border-neutral-200 dark:border-dark-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-neutral-800 dark:text-dark-text-primary">
                <Lock className="w-5 h-5 text-primary-600 dark:text-dark-green-500" />
                Change Password
              </CardTitle>
              <CardDescription>
                Update your password to keep your account secure
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Current Password</Label>
                <Input
                  id="currentPassword"
                  name="currentPassword"
                  type="password"
                  value={formData.currentPassword}
                  onChange={handleInputChange}
                  placeholder="Enter current password"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="newPassword">New Password</Label>
                  <Input
                    id="newPassword"
                    name="newPassword"
                    type="password"
                    value={formData.newPassword}
                    onChange={handleInputChange}
                    placeholder="Enter new password"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    placeholder="Confirm new password"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Preferences Card */}
        <motion.div variants={itemVariants}>
          <Card className="hover:shadow-md border-2 border-neutral-200 dark:border-dark-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-neutral-800 dark:text-dark-text-primary">
                <Bell className="w-5 h-5 text-primary-600 dark:text-dark-green-500" />
                Preferences
              </CardTitle>
              <CardDescription>
                Customize your application experience
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Dark Mode Toggle */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {isDark ? (
                    <Moon className="w-5 h-5 text-primary-600 dark:text-dark-green-500" />
                  ) : (
                    <Sun className="w-5 h-5 text-primary-600 dark:text-dark-green-500" />
                  )}
                  <div>
                    <Label className="text-base font-medium text-neutral-800 dark:text-dark-text-primary">Dark Mode</Label>
                    <p className="text-sm text-neutral-600 dark:text-dark-text-secondary">
                      Enable dark theme for comfortable viewing
                    </p>
                  </div>
                </div>
                <Switch
                  checked={isDark}
                  onCheckedChange={toggleTheme}
                  aria-label="Toggle dark mode"
                />
              </div>

              <div className="border-t border-neutral-200 dark:border-dark-border pt-6" />

              {/* Email Notifications Toggle */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Bell className="w-5 h-5 text-primary-600 dark:text-dark-green-500" />
                  <div>
                    <Label className="text-base font-medium text-neutral-800 dark:text-dark-text-primary">Email Notifications</Label>
                    <p className="text-sm text-neutral-600 dark:text-dark-text-secondary">
                      Receive email updates about course activities
                    </p>
                  </div>
                </div>
                <Switch
                  checked={emailNotifications}
                  onCheckedChange={setEmailNotifications}
                  aria-label="Toggle email notifications"
                />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Save Button */}
        <motion.div
          variants={itemVariants}
          className="flex justify-end"
        >
          <Button
            size="lg"
            onClick={handleSaveChanges}
            disabled={loading}
            className="min-w-[200px] bg-gradient-to-r from-primary-500 to-secondary-500 dark:from-dark-green-500 dark:to-secondary-600"
          >
            <Save className="w-4 h-4 mr-2" />
            {loading ? "Saving..." : "Save Changes"}
          </Button>
        </motion.div>
      </motion.div>
    </motion.div>
  );
};

export default Settings;
