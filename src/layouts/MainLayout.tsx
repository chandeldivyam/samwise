import React from 'react';
import { Box, Drawer, List, ListItem, ListItemIcon, ListItemText } from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';
import { navigationItems, bottomNavigationItems } from '../constants/navigation';

const drawerWidth = 240;

interface MainLayoutProps {
  children: React.ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleNavigation = (path: string) => {
    navigate(path);
  };

  const renderNavItems = (items: typeof navigationItems) => (
    <List>
      {items.map((item) => (
        <ListItem
          button
          key={item.name}
          onClick={() => handleNavigation(item.path)}
          selected={location.pathname === item.path}
        >
          <ListItemIcon>
            <item.icon />
          </ListItemIcon>
          <ListItemText primary={item.name} />
        </ListItem>
      ))}
    </List>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      <Drawer
        variant="permanent"
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          [`& .MuiDrawer-paper`]: { width: drawerWidth, boxSizing: 'border-box' },
        }}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          {renderNavItems(navigationItems)}
          <Box sx={{ flexGrow: 1 }} />
          {renderNavItems(bottomNavigationItems)}
        </Box>
      </Drawer>
      <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
        {children}
      </Box>
    </Box>
  );
};

export default MainLayout;