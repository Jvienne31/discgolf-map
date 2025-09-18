import React, { useState } from 'react';
import { Box, AppBar, Toolbar, Typography, Drawer, IconButton } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import MapComponent from './components/MapComponent';
import Sidebar from './components/Sidebar';

const drawerWidth = 300;

const App: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <Box sx={{ display: 'flex', height: '100vh' }}>
      <AppBar
        position="fixed"
        sx={{
          zIndex: (theme) => theme.zIndex.drawer + 1,
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
        variant="persistent"
        open={sidebarOpen}
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            boxSizing: 'border-box',
          },
        }}
      >
        <Toolbar />
        <Sidebar />
      </Drawer>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          height: '100vh',
          transition: 'margin 0.3s',
          marginLeft: sidebarOpen ? `${drawerWidth}px` : '0',
        }}
      >
        <Toolbar />
        <MapComponent />
      </Box>
    </Box>
  );
};

export default App;