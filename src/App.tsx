import { useState } from 'react';
import { Box, AppBar, Toolbar, Typography, Drawer, IconButton, useMediaQuery, useTheme } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import Sidebar from './components/Sidebar';
import DiagnosticMapComponent from './components/DiagnosticMapComponent';
import { LeafletDrawingProvider } from './contexts/LeafletDrawingContext';

const drawerWidth = 300;

const App = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <LeafletDrawingProvider>
      <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
        <AppBar
          position="fixed"
          sx={{
            zIndex: (theme) => theme.zIndex.drawer + 1,
            backgroundColor: '#2e7d32',
          }}
        >
          <Toolbar>
            <IconButton
              color="inherit"
              aria-label="toggle sidebar"
              onClick={toggleSidebar}
              edge="start"
              sx={{ mr: 2 }}
            >
              <MenuIcon />
            </IconButton>
            <Typography variant="h6" noWrap component="div">
              DiscGolf Course Mapper
            </Typography>
          </Toolbar>
        </AppBar>

        <Drawer
          variant={isMobile ? 'temporary' : 'persistent'}
          open={sidebarOpen}
          onClose={toggleSidebar}
          sx={{
            width: drawerWidth,
            flexShrink: 0,
            '& .MuiDrawer-paper': {
              width: drawerWidth,
              boxSizing: 'border-box',
              marginTop: '64px', // AppBar height
              height: 'calc(100vh - 64px)',
            },
          }}
          ModalProps={{
            keepMounted: true, // Better performance on mobile
          }}
        >
          <Sidebar />
        </Drawer>

        <Box
          component="main"
          sx={{
            flexGrow: 1,
            height: '100vh',
            position: 'relative',
            marginLeft: isMobile ? 0 : (sidebarOpen ? `${drawerWidth}px` : '0'),
            transition: theme.transitions.create('margin', {
              easing: theme.transitions.easing.sharp,
              duration: theme.transitions.duration.leavingScreen,
            }),
            ...(sidebarOpen && !isMobile && {
              transition: theme.transitions.create('margin', {
                easing: theme.transitions.easing.easeOut,
                duration: theme.transitions.duration.enteringScreen,
              }),
            }),
          }}
        >
          <Toolbar /> {/* Spacer for AppBar */}
          <Box sx={{ height: 'calc(100vh - 64px)', width: '100%' }}>
            <DiagnosticMapComponent />
          </Box>
        </Box>
      </Box>
    </LeafletDrawingProvider>
  );
};

export default App;