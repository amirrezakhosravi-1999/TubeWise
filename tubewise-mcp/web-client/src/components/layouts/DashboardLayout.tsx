import React, { ReactNode } from 'react';
import { Box, Flex, Icon, Text, VStack, HStack, Heading, Avatar, useColorModeValue, IconButton, Drawer, DrawerOverlay, DrawerContent, DrawerCloseButton, DrawerHeader, DrawerBody, useDisclosure, Divider } from '@chakra-ui/react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { FiHome, FiUsers, FiSettings, FiCreditCard, FiBarChart2, FiAlertTriangle, FiMenu, FiLogOut } from 'react-icons/fi';
import { useSession, signOut } from 'next-auth/react';
import { logger } from '@/utils/logger';
import { LogCategory } from '@/utils/logger';

interface NavItemProps {
  icon: React.ReactElement;
  children: string;
  href: string;
  isActive?: boolean;
}

const NavItem = ({ icon, children, href, isActive }: NavItemProps) => {
  const activeBg = useColorModeValue('brand.50', 'brand.900');
  const inactiveBg = useColorModeValue('transparent', 'transparent');
  const activeColor = useColorModeValue('brand.700', 'brand.200');
  const inactiveColor = useColorModeValue('gray.600', 'gray.400');

  return (
    <Link href={href} passHref>
      <Flex
        align="center"
        p="4"
        mx="4"
        borderRadius="lg"
        role="group"
        cursor="pointer"
        bg={isActive ? activeBg : inactiveBg}
        color={isActive ? activeColor : inactiveColor}
        _hover={{
          bg: activeBg,
          color: activeColor,
        }}
      >
        {icon}
        <Text fontWeight={isActive ? "bold" : "medium"} ml="4">
          {children}
        </Text>
      </Flex>
    </Link>
  );
};

interface DashboardLayoutProps {
  children: ReactNode;
  title?: string;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children, title = 'داشبورد' }) => {
  const { data: session } = useSession();
  const router = useRouter();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const bgColor = useColorModeValue('gray.50', 'gray.900');
  const borderColor = useColorModeValue('gray.200', 'gray.700');

  // Check if current route is active
  const isRouteActive = (route: string) => {
    return router.pathname === route || router.pathname.startsWith(`${route}/`);
  };

  // Handle logout
  const handleLogout = async () => {
    try {
      logger.info(LogCategory.USER_ACTION, 'User logged out from admin dashboard');
      await signOut({ redirect: true, callbackUrl: '/' });
    } catch (error) {
      logger.error(LogCategory.AUTH, 'Error during logout', { error });
    }
  };

  // Navigation items
  const navItems = [
    { name: 'داشبورد', icon: <Icon as={FiHome} fontSize="xl" />, href: '/admin/dashboard' },
    { name: 'کاربران', icon: <Icon as={FiUsers} fontSize="xl" />, href: '/admin/users' },
    { name: 'اشتراک‌ها', icon: <Icon as={FiCreditCard} fontSize="xl" />, href: '/admin/subscriptions' },
    { name: 'آمار و تحلیل', icon: <Icon as={FiBarChart2} fontSize="xl" />, href: '/admin/analytics' },
    { name: 'گزارش خطاها', icon: <Icon as={FiAlertTriangle} fontSize="xl" />, href: '/admin/errors' },
    { name: 'تنظیمات', icon: <Icon as={FiSettings} fontSize="xl" />, href: '/admin/settings' },
  ];

  // Sidebar content
  const SidebarContent = (
    <Box
      bg={useColorModeValue('white', 'gray.800')}
      borderRight="1px"
      borderRightColor={borderColor}
      w={{ base: 'full', md: 60 }}
      pos="fixed"
      h="full"
    >
      <Flex h="20" alignItems="center" mx="8" justifyContent="space-between">
        <Text fontSize="2xl" fontWeight="bold" color={useColorModeValue('brand.500', 'brand.300')}>
          TubeWise
        </Text>
      </Flex>
      <VStack spacing="1" align="stretch" mt="4">
        {navItems.map((item) => (
          <NavItem 
            key={item.name} 
            icon={item.icon} 
            href={item.href}
            isActive={isRouteActive(item.href)}
          >
            {item.name}
          </NavItem>
        ))}
      </VStack>
      <Divider my="6" borderColor={borderColor} />
      <Box px="8" pb="6" pt="4" mt="auto">
        <Flex direction="column" alignItems="center">
          <HStack spacing="3" mb="4">
            <Avatar 
              size="sm" 
              name={session?.user?.name || 'Admin User'} 
              src={session?.user?.image || undefined} 
            />
            <VStack spacing="1" alignItems="flex-start">
              <Text fontWeight="medium">{session?.user?.name || 'Admin User'}</Text>
              <Text fontSize="xs" color="gray.500">{session?.user?.email || 'admin@example.com'}</Text>
            </VStack>
          </HStack>
          <IconButton
            variant="outline"
            colorScheme="red"
            aria-label="خروج"
            icon={<FiLogOut />}
            onClick={handleLogout}
            size="sm"
            width="full"
          />
        </Flex>
      </Box>
    </Box>
  );

  return (
    <Box minH="100vh" bg={bgColor}>
      {/* Mobile nav */}
      <Drawer
        autoFocus={false}
        isOpen={isOpen}
        placement="right"
        onClose={onClose}
        returnFocusOnClose={false}
        onOverlayClick={onClose}
        size="full"
      >
        <DrawerOverlay />
        <DrawerContent>
          <DrawerCloseButton />
          <DrawerHeader borderBottomWidth="1px">منوی مدیریت</DrawerHeader>
          <DrawerBody>
            {SidebarContent}
          </DrawerBody>
        </DrawerContent>
      </Drawer>
      
      {/* Desktop nav */}
      <Box display={{ base: 'none', md: 'block' }} w={60}>
        {SidebarContent}
      </Box>
      
      {/* Main content */}
      <Box ml={{ base: 0, md: 60 }} p="4">
        {/* Mobile header */}
        <Flex
          display={{ base: 'flex', md: 'none' }}
          alignItems="center"
          justifyContent="space-between"
          mb="8"
        >
          <IconButton
            aria-label="Open menu"
            icon={<FiMenu />}
            onClick={onOpen}
            variant="outline"
          />
          <Heading size="lg" color={useColorModeValue('brand.500', 'brand.300')}>
            TubeWise
          </Heading>
          <Box w="40px" /> {/* Spacer for alignment */}
        </Flex>
        
        {/* Page header */}
        <Flex 
          mb="8" 
          justifyContent="space-between" 
          alignItems="center"
          flexDirection={{ base: 'column', sm: 'row' }}
        >
          <Heading size="lg" mb={{ base: 4, sm: 0 }}>{title}</Heading>
        </Flex>
        
        {/* Page content */}
        <Box 
          bg={useColorModeValue('white', 'gray.800')} 
          p="6" 
          rounded="lg" 
          shadow="sm"
          borderWidth="1px"
          borderColor={borderColor}
        >
          {children}
        </Box>
      </Box>
    </Box>
  );
};

export default DashboardLayout;
