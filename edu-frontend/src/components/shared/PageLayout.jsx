import { Box, Container, Typography, Breadcrumbs, Link as MuiLink } from '@mui/material';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { NavigateNext } from '@mui/icons-material';

/**
 * Consistent Page Layout Component
 * Provides standard page structure with header, breadcrumbs, and content area
 */
const PageLayout = ({
  title,
  subtitle,
  icon: Icon,
  breadcrumbs = [],
  actions,
  children,
  maxWidth = 'xl',
  noPadding = false,
}) => {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: 'background.default',
        pt: noPadding ? 0 : 4,
        pb: noPadding ? 0 : 6,
      }}
    >
      <Container maxWidth={maxWidth}>
        {/* Breadcrumbs */}
        {breadcrumbs.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Breadcrumbs
              separator={<NavigateNext fontSize="small" />}
              sx={{ mb: 3 }}
            >
              {breadcrumbs.map((crumb, index) =>
                crumb.to ? (
                  <MuiLink
                    key={index}
                    component={Link}
                    to={crumb.to}
                    underline="hover"
                    color="inherit"
                    sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
                  >
                    {crumb.icon && <crumb.icon fontSize="small" />}
                    {crumb.label}
                  </MuiLink>
                ) : (
                  <Typography
                    key={index}
                    color="text.primary"
                    sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
                  >
                    {crumb.icon && <crumb.icon fontSize="small" />}
                    {crumb.label}
                  </Typography>
                )
              )}
            </Breadcrumbs>
          </motion.div>
        )}

        {/* Page Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              mb: 4,
              flexWrap: 'wrap',
              gap: 2,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              {Icon && (
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 56,
                    height: 56,
                    borderRadius: 3,
                    bgcolor: 'primary.main',
                    color: 'white',
                    boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)',
                  }}
                >
                  <Icon sx={{ fontSize: 32 }} />
                </Box>
              )}
              <Box>
                <Typography
                  variant="h4"
                  fontWeight="bold"
                  sx={{
                    background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}
                >
                  {title}
                </Typography>
                {subtitle && (
                  <Typography variant="body1" color="text.secondary" sx={{ mt: 0.5 }}>
                    {subtitle}
                  </Typography>
                )}
              </Box>
            </Box>

            {/* Action Buttons */}
            {actions && (
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                {actions}
              </Box>
            )}
          </Box>
        </motion.div>

        {/* Page Content */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          {children}
        </motion.div>
      </Container>
    </Box>
  );
};

export default PageLayout;
