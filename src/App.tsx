
import { useState, useEffect } from 'react';
import { Box, AppBar, Toolbar, Typography, Drawer, IconButton, useMediaQuery, useTheme, Button, CircularProgress } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import Sidebar from './components/Sidebar';
import DiagnosticMapComponent from './components/DiagnosticMapComponent';
import { LeafletDrawingProvider } from './contexts/LeafletDrawingContext';
import StartupScreen, { CourseListItem } from './components/StartupScreen';
import { apiService } from './services/api';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import LoginPage from './components/LoginPage';

const drawerWidth = 300;
const LAST_COURSE_ID_KEY = 'dgmap_last_active_course_id';

const getSavedCourses = async (): Promise<CourseListItem[]> => {
  try {
    const courses = await apiService.getCourses();
    // Enrichir chaque parcours avec le nombre de trous
    const coursesWithHoleCount = await Promise.all(
      courses.map(async (course) => {
        try {
          const courseData = await apiService.getCourse(course.id);
          return {
            ...course,
            holeCount: courseData.holes?.length || 0
          };
        } catch (error) {
          return course;
        }
      })
    );
    return coursesWithHoleCount;
  } catch (error) {
    console.error('Erreur lors du chargement des parcours:', error);
    return [];
  }
};

const AppContent = () => {
  const { isAuthenticated, loading } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  // Tous les hooks doivent être appelés avant tout return conditionnel
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);
  const [activeCourseId, setActiveCourseId] = useState<string | null>(() => {
      if (typeof window !== 'undefined') {
          return localStorage.getItem(LAST_COURSE_ID_KEY);
      }
      return null;
  });
  const [courses, setCourses] = useState<CourseListItem[]>([]);

  useEffect(() => {
    if (!isAuthenticated) return;
    
    const loadCourses = async () => {
      const loadedCourses = await getSavedCourses();
      setCourses(loadedCourses);
    };
    loadCourses();
    if (isMobile) {
      setSidebarOpen(false);
    }
  }, [isMobile, isAuthenticated]);

  // Maintenant on peut faire les returns conditionnels après tous les hooks
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress size={60} />
      </Box>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  const handleSetActiveCourseId = (courseId: string | null) => {
      setActiveCourseId(courseId);
      if (courseId) {
          localStorage.setItem(LAST_COURSE_ID_KEY, courseId);
      } else {
          localStorage.removeItem(LAST_COURSE_ID_KEY);
      }
  };

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

  const handleCoursesChange = async () => {
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
        onCoursesChange={handleCoursesChange}
      />
    );
  }

  return (
    <LeafletDrawingProvider courseId={activeCourseId}>
      <Box sx={{ display: 'flex', height: '100vh' }}>
        <AppBar
          position="fixed"
          color="primary"
          sx={{
            zIndex: (theme) => theme.zIndex.drawer + (isMobile ? 0 : 1),
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

const App = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;
