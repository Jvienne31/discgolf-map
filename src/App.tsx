
import { useState, useEffect } from 'react';
import { Box, AppBar, Toolbar, Typography, Drawer, IconButton, useMediaQuery, useTheme, Button } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import Sidebar from './components/Sidebar';
import DiagnosticMapComponent from './components/DiagnosticMapComponent';
import { LeafletDrawingProvider } from './contexts/LeafletDrawingContext';
import StartupScreen, { CourseListItem } from './components/StartupScreen';
import { apiService } from './services/api';

const drawerWidth = 300;
const LAST_COURSE_ID_KEY = 'dgmap_last_active_course_id';

const getSavedCourses = async (): Promise<CourseListItem[]> => {
  try {
    return await apiService.getCourses();
  } catch (error) {
    console.error('Erreur lors du chargement des parcours:', error);
    return [];
  }
};

const App = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);
  
  const [activeCourseId, setActiveCourseId] = useState<string | null>(() => {
      if (typeof window !== 'undefined') {
          return localStorage.getItem(LAST_COURSE_ID_KEY);
      }
      return null;
  });
  
  const [courses, setCourses] = useState<CourseListItem[]>([]);

  const handleSetActiveCourseId = (courseId: string | null) => {
      setActiveCourseId(courseId);
      if (courseId) {
          localStorage.setItem(LAST_COURSE_ID_KEY, courseId);
      } else {
          localStorage.removeItem(LAST_COURSE_ID_KEY);
      }
  };

  useEffect(() => {
    const loadCourses = async () => {
      const loadedCourses = await getSavedCourses();
      setCourses(loadedCourses);
    };
    loadCourses();
    if (isMobile) {
      setSidebarOpen(false);
    }
  }, [isMobile]);

  const handleSelectCourse = (courseId: string) => {
    handleSetActiveCourseId(courseId);
  };

  const handleCreateCourse = async (courseName: string) => {
    try {
      const newCourseId = `dgmap_course_${Date.now()}`;
      const newCourse = {
        id: newCourseId,
        name: courseName,
        holes: [{ number: 1, par: 3, elements: [] }],
        currentHole: 1,
        past: [],
        future: [],
      };
      await apiService.createCourse(newCourse);
      const loadedCourses = await getSavedCourses();
      setCourses(loadedCourses);
      handleSetActiveCourseId(newCourseId);
    } catch (error) {
      console.error('Erreur lors de la création du parcours:', error);
    }
  };

  const handleExit = async () => {
    handleSetActiveCourseId(null);
    const loadedCourses = await getSavedCourses();
    setCourses(loadedCourses);
  };

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  if (!activeCourseId) {
    return (
      <StartupScreen 
        courses={courses} 
        onSelectCourse={handleSelectCourse} 
        onCreateCourse={handleCreateCourse} 
      />
    );
  }

  return (
    <LeafletDrawingProvider courseId={activeCourseId}>
      <Box sx={{ display: 'flex', height: '100vh' }}>
        <AppBar
          position="fixed"
          sx={{
            zIndex: (theme) => theme.zIndex.drawer + (isMobile ? 0 : 1),
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
            <Button color="inherit" onClick={handleExit} sx={{ ml: 'auto' }}>Changer de parcours</Button>
          </Toolbar>
        </AppBar>

        <Drawer
          variant={isMobile ? 'temporary' : 'persistent'}
          open={sidebarOpen}
          onClose={toggleSidebar}
          sx={{
            width: sidebarOpen ? drawerWidth : 0,
            flexShrink: 0,
            transition: theme.transitions.create('width', {
                easing: theme.transitions.easing.sharp,
                duration: theme.transitions.duration.enteringScreen,
            }),
            [`& .MuiDrawer-paper`]: { 
              width: drawerWidth,
              boxSizing: 'border-box',
              marginTop: isMobile ? 0 : '64px', 
              height: isMobile ? '100vh' : 'calc(100vh - 64px)',
              overflowX: 'hidden',
            },
          }}
          ModalProps={{ keepMounted: true }}
        >
          <Sidebar />
        </Drawer>

        <Box
          component="main"
          sx={{
            flexGrow: 1,
            height: '100vh',
            position: 'relative',
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          <Toolbar />
          <Box sx={{ flexGrow: 1, width: '100%' }}>
            <DiagnosticMapComponent />
          </Box>
        </Box>
      </Box>
    </LeafletDrawingProvider>
  );
};

export default App;
