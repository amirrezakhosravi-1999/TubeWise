import { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Heading,
  Text,
  VStack,
  HStack,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Badge,
  Button,
  Flex,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  SimpleGrid,
  Input,
  Select,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  FormControl,
  FormLabel,
  useDisclosure,
  useToast,
  Spinner,
  useColorModeValue,
  IconButton
} from '@chakra-ui/react';
import { FaEdit, FaTrash, FaKey, FaSearch, FaFilter, FaUserPlus, FaChartLine } from 'react-icons/fa';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';

export async function getStaticProps({ locale }: { locale: string }) {
  return {
    props: {
      ...(await serverSideTranslations(locale, ['common'])),
    },
  };
}

// Types for admin dashboard
interface User {
  id: number;
  email: string;
  name: string;
  role: string;
  credits: number;
  created_at: string;
  last_active?: string;
  usage_stats: {
    videos_summarized: number;
    videos_compared: number;
    content_generated: number;
    fact_checks: number;
  };
}

interface SystemLog {
  id: number;
  timestamp: string;
  level: string;
  message: string;
  source: string;
}

interface DashboardStats {
  total_users: number;
  active_users_last_24h: number;
  active_users_last_7d: number;
  total_videos_processed: number;
  total_comparisons: number;
  total_fact_checks: number;
  total_content_generated: number;
  pro_users_count: number;
  free_users_count: number;
}

export default function AdminDashboard() {
  const { t } = useTranslation('common');
  const router = useRouter();
  const toast = useToast();
  const auth = useAuth();
  
  // State for users
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  
  // State for logs
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [logFilter, setLogFilter] = useState('');
  const [logLevelFilter, setLogLevelFilter] = useState('');
  const [isLoadingLogs, setIsLoadingLogs] = useState(true);
  
  // State for dashboard stats
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  
  // Modal states
  const { isOpen: isEditUserOpen, onOpen: onEditUserOpen, onClose: onEditUserClose } = useDisclosure();
  const { isOpen: isResetPasswordOpen, onOpen: onResetPasswordOpen, onClose: onResetPasswordClose } = useDisclosure();
  const { isOpen: isDeleteUserOpen, onOpen: onDeleteUserOpen, onClose: onDeleteUserClose } = useDisclosure();
  
  // Edit user form state
  const [editUserForm, setEditUserForm] = useState({
    role: '',
    credits: 0,
    language_preference: ''
  });
  
  // Color mode values
  const bgColor = useColorModeValue('gray.50', 'gray.900');
  const cardBgColor = useColorModeValue('white', 'gray.800');
  const accentColor = useColorModeValue('purple.600', 'purple.300');
  const statBgColor = useColorModeValue('purple.50', 'purple.900');
  
  // Check if user is admin
  useEffect(() => {
    if (auth.user && auth.user.role !== 'admin') {
      router.push('/');
      toast({
        title: t('admin.unauthorized'),
        description: t('admin.adminOnly'),
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  }, [auth.user, router]);
  
  // Fetch users, logs, and stats
  useEffect(() => {
    if (auth.user?.role === 'admin') {
      fetchUsers();
      fetchLogs();
      fetchStats();
    }
  }, [auth.user]);
  
  // Filter users when search or role filter changes
  useEffect(() => {
    if (users.length > 0) {
      let filtered = [...users];
      
      if (userSearch) {
        const searchLower = userSearch.toLowerCase();
        filtered = filtered.filter(user => 
          user.name.toLowerCase().includes(searchLower) || 
          user.email.toLowerCase().includes(searchLower)
        );
      }
      
      if (roleFilter) {
        filtered = filtered.filter(user => user.role === roleFilter);
      }
      
      setFilteredUsers(filtered);
    }
  }, [users, userSearch, roleFilter]);
  
  const fetchUsers = async () => {
    try {
      setIsLoadingUsers(true);
      
      // Get API URL from environment variable or use default
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      
      const response = await axios.get(`${apiUrl}/api/admin/users`, {
        headers: {
          Authorization: `Bearer ${auth.token}`
        }
      });
      
      setUsers(response.data);
      setFilteredUsers(response.data);
      setIsLoadingUsers(false);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: t('admin.fetchError'),
        description: error instanceof Error ? error.message : t('errors.generalError'),
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      setIsLoadingUsers(false);
    }
  };
  
  const fetchLogs = async () => {
    try {
      setIsLoadingLogs(true);
      
      // Get API URL from environment variable or use default
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      
      const response = await axios.get(`${apiUrl}/api/admin/logs`, {
        headers: {
          Authorization: `Bearer ${auth.token}`
        }
      });
      
      setLogs(response.data);
      setIsLoadingLogs(false);
    } catch (error) {
      console.error('Error fetching logs:', error);
      toast({
        title: t('admin.fetchError'),
        description: error instanceof Error ? error.message : t('errors.generalError'),
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      setIsLoadingLogs(false);
    }
  };
  
  const fetchStats = async () => {
    try {
      setIsLoadingStats(true);
      
      // Get API URL from environment variable or use default
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      
      const response = await axios.get(`${apiUrl}/api/admin/dashboard/stats`, {
        headers: {
          Authorization: `Bearer ${auth.token}`
        }
      });
      
      setStats(response.data);
      setIsLoadingStats(false);
    } catch (error) {
      console.error('Error fetching stats:', error);
      toast({
        title: t('admin.fetchError'),
        description: error instanceof Error ? error.message : t('errors.generalError'),
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      setIsLoadingStats(false);
    }
  };
  
  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setEditUserForm({
      role: user.role,
      credits: user.credits,
      language_preference: user.language_preference || 'en'
    });
    onEditUserOpen();
  };
  
  const handleResetPassword = (user: User) => {
    setSelectedUser(user);
    onResetPasswordOpen();
  };
  
  const handleDeleteUser = (user: User) => {
    setSelectedUser(user);
    onDeleteUserOpen();
  };
  
  const submitEditUser = async () => {
    if (!selectedUser) return;
    
    try {
      // Get API URL from environment variable or use default
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      
      await axios.put(
        `${apiUrl}/api/admin/users/${selectedUser.id}`,
        editUserForm,
        {
          headers: {
            Authorization: `Bearer ${auth.token}`
          }
        }
      );
      
      // Refresh users list
      fetchUsers();
      
      toast({
        title: t('admin.userUpdated'),
        description: t('admin.userUpdatedDesc'),
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      
      onEditUserClose();
    } catch (error) {
      console.error('Error updating user:', error);
      toast({
        title: t('admin.updateError'),
        description: error instanceof Error ? error.message : t('errors.generalError'),
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };
  
  const submitResetPassword = async () => {
    if (!selectedUser) return;
    
    try {
      // Get API URL from environment variable or use default
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      
      await axios.post(
        `${apiUrl}/api/admin/users/${selectedUser.id}/reset-password`,
        {},
        {
          headers: {
            Authorization: `Bearer ${auth.token}`
          }
        }
      );
      
      toast({
        title: t('admin.passwordReset'),
        description: t('admin.passwordResetDesc'),
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      
      onResetPasswordClose();
    } catch (error) {
      console.error('Error resetting password:', error);
      toast({
        title: t('admin.resetError'),
        description: error instanceof Error ? error.message : t('errors.generalError'),
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };
  
  const submitDeleteUser = async () => {
    if (!selectedUser) return;
    
    try {
      // Get API URL from environment variable or use default
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      
      await axios.delete(
        `${apiUrl}/api/admin/users/${selectedUser.id}`,
        {
          headers: {
            Authorization: `Bearer ${auth.token}`
          }
        }
      );
      
      // Refresh users list
      fetchUsers();
      
      toast({
        title: t('admin.userDeleted'),
        description: t('admin.userDeletedDesc'),
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      
      onDeleteUserClose();
    } catch (error) {
      console.error('Error deleting user:', error);
      toast({
        title: t('admin.deleteError'),
        description: error instanceof Error ? error.message : t('errors.generalError'),
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };
  
  return (
    <>
      <Head>
        <title>{t('admin.title')} | TubeWise</title>
        <meta name="description" content={t('admin.description')} />
      </Head>
      
      <Box bg={bgColor} minH="100vh" py={8}>
        <Container maxW="container.xl">
          <VStack spacing={8} align="stretch">
            <Flex justifyContent="space-between" alignItems="center">
              <Box>
                <Heading size="xl" color={accentColor}>
                  {t('admin.dashboard')}
                </Heading>
                <Text fontSize="lg" mt={2}>
                  {t('admin.subtitle')}
                </Text>
              </Box>
              
              <Button onClick={() => router.push('/')} colorScheme="purple" variant="outline">
                {t('admin.backToApp')}
              </Button>
            </Flex>
            
            {/* Dashboard Tabs */}
            <Tabs colorScheme="purple" variant="enclosed">
              <TabList>
                <Tab>{t('admin.overview')}</Tab>
                <Tab>{t('admin.users')}</Tab>
                <Tab>{t('admin.logs')}</Tab>
              </TabList>
              
              <TabPanels>
                {/* Overview Tab */}
                <TabPanel>
                  {isLoadingStats ? (
                    <Box textAlign="center" py={10}>
                      <Spinner size="xl" color="purple.500" />
                      <Text mt={4}>{t('admin.loadingStats')}</Text>
                    </Box>
                  ) : stats ? (
                    <VStack spacing={6} align="stretch">
                      <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={6}>
                        <Stat bg={statBgColor} p={4} borderRadius="md" boxShadow="sm">
                          <StatLabel>{t('admin.totalUsers')}</StatLabel>
                          <StatNumber>{stats.total_users}</StatNumber>
                          <StatHelpText>
                            {t('admin.proUsers')}: {stats.pro_users_count} | {t('admin.freeUsers')}: {stats.free_users_count}
                          </StatHelpText>
                        </Stat>
                        
                        <Stat bg={statBgColor} p={4} borderRadius="md" boxShadow="sm">
                          <StatLabel>{t('admin.activeUsers')}</StatLabel>
                          <StatNumber>{stats.active_users_last_24h}</StatNumber>
                          <StatHelpText>
                            {t('admin.last7Days')}: {stats.active_users_last_7d}
                          </StatHelpText>
                        </Stat>
                        
                        <Stat bg={statBgColor} p={4} borderRadius="md" boxShadow="sm">
                          <StatLabel>{t('admin.videosProcessed')}</StatLabel>
                          <StatNumber>{stats.total_videos_processed}</StatNumber>
                        </Stat>
                        
                        <Stat bg={statBgColor} p={4} borderRadius="md" boxShadow="sm">
                          <StatLabel>{t('admin.comparisons')}</StatLabel>
                          <StatNumber>{stats.total_comparisons}</StatNumber>
                        </Stat>
                      </SimpleGrid>
                      
                      <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6}>
                        <Stat bg={statBgColor} p={4} borderRadius="md" boxShadow="sm">
                          <StatLabel>{t('admin.factChecks')}</StatLabel>
                          <StatNumber>{stats.total_fact_checks}</StatNumber>
                        </Stat>
                        
                        <Stat bg={statBgColor} p={4} borderRadius="md" boxShadow="sm">
                          <StatLabel>{t('admin.contentGenerated')}</StatLabel>
                          <StatNumber>{stats.total_content_generated}</StatNumber>
                        </Stat>
                        
                        <Stat bg={statBgColor} p={4} borderRadius="md" boxShadow="sm">
                          <StatLabel>{t('admin.conversionRate')}</StatLabel>
                          <StatNumber>
                            {stats.total_users > 0 
                              ? `${Math.round((stats.pro_users_count / stats.total_users) * 100)}%` 
                              : '0%'}
                          </StatNumber>
                          <StatHelpText>
                            {t('admin.freeToProConversion')}
                          </StatHelpText>
                        </Stat>
                      </SimpleGrid>
                    </VStack>
                  ) : (
                    <Box textAlign="center" py={10}>
                      <Text>{t('admin.noStatsAvailable')}</Text>
                    </Box>
                  )}
                </TabPanel>
                
                {/* Users Tab */}
                <TabPanel>
                  <VStack spacing={6} align="stretch">
                    <Flex 
                      direction={{ base: 'column', md: 'row' }} 
                      justify="space-between"
                      align={{ base: 'stretch', md: 'center' }}
                      gap={4}
                    >
                      <HStack spacing={4}>
                        <Input
                          placeholder={t('admin.searchUsers')}
                          value={userSearch}
                          onChange={(e) => setUserSearch(e.target.value)}
                          width={{ base: 'full', md: '300px' }}
                          leftElement={<Box pl={2}><FaSearch color="gray.300" /></Box>}
                        />
                        
                        <Select
                          placeholder={t('admin.filterByRole')}
                          value={roleFilter}
                          onChange={(e) => setRoleFilter(e.target.value)}
                          width={{ base: 'full', md: '200px' }}
                        >
                          <option value="">All Roles</option>
                          <option value="free">Free</option>
                          <option value="pro">Pro</option>
                          <option value="admin">Admin</option>
                        </Select>
                      </HStack>
                      
                      <Button leftIcon={<FaUserPlus />} colorScheme="purple">
                        {t('admin.addUser')}
                      </Button>
                    </Flex>
                    
                    {isLoadingUsers ? (
                      <Box textAlign="center" py={10}>
                        <Spinner size="xl" color="purple.500" />
                        <Text mt={4}>{t('admin.loadingUsers')}</Text>
                      </Box>
                    ) : filteredUsers.length > 0 ? (
                      <Box overflowX="auto">
                        <Table variant="simple">
                          <Thead>
                            <Tr>
                              <Th>{t('admin.name')}</Th>
                              <Th>{t('admin.email')}</Th>
                              <Th>{t('admin.role')}</Th>
                              <Th>{t('admin.credits')}</Th>
                              <Th>{t('admin.usage')}</Th>
                              <Th>{t('admin.lastActive')}</Th>
                              <Th>{t('admin.actions')}</Th>
                            </Tr>
                          </Thead>
                          <Tbody>
                            {filteredUsers.map((user) => (
                              <Tr key={user.id}>
                                <Td>{user.name}</Td>
                                <Td>{user.email}</Td>
                                <Td>
                                  <Badge 
                                    colorScheme={
                                      user.role === 'admin' ? 'red' : 
                                      user.role === 'pro' ? 'purple' : 
                                      'gray'
                                    }
                                  >
                                    {user.role.toUpperCase()}
                                  </Badge>
                                </Td>
                                <Td>{user.credits}</Td>
                                <Td>
                                  <VStack align="start" spacing={1}>
                                    <Text fontSize="xs">
                                      {t('admin.videos')}: {user.usage_stats.videos_summarized}
                                    </Text>
                                    <Text fontSize="xs">
                                      {t('admin.comparisons')}: {user.usage_stats.videos_compared}
                                    </Text>
                                    <Text fontSize="xs">
                                      {t('admin.content')}: {user.usage_stats.content_generated}
                                    </Text>
                                    <Text fontSize="xs">
                                      {t('admin.factChecks')}: {user.usage_stats.fact_checks}
                                    </Text>
                                  </VStack>
                                </Td>
                                <Td>
                                  {user.last_active 
                                    ? new Date(user.last_active).toLocaleDateString() 
                                    : t('admin.never')}
                                </Td>
                                <Td>
                                  <HStack spacing={2}>
                                    <IconButton
                                      aria-label={t('admin.edit')}
                                      icon={<FaEdit />}
                                      size="sm"
                                      colorScheme="blue"
                                      onClick={() => handleEditUser(user)}
                                    />
                                    <IconButton
                                      aria-label={t('admin.resetPassword')}
                                      icon={<FaKey />}
                                      size="sm"
                                      colorScheme="yellow"
                                      onClick={() => handleResetPassword(user)}
                                    />
                                    <IconButton
                                      aria-label={t('admin.delete')}
                                      icon={<FaTrash />}
                                      size="sm"
                                      colorScheme="red"
                                      onClick={() => handleDeleteUser(user)}
                                    />
                                  </HStack>
                                </Td>
                              </Tr>
                            ))}
                          </Tbody>
                        </Table>
                      </Box>
                    ) : (
                      <Box textAlign="center" py={10}>
                        <Text>{t('admin.noUsersFound')}</Text>
                      </Box>
                    )}
                  </VStack>
                </TabPanel>
                
                {/* Logs Tab */}
                <TabPanel>
                  <VStack spacing={6} align="stretch">
                    <Flex 
                      direction={{ base: 'column', md: 'row' }} 
                      justify="space-between"
                      align={{ base: 'stretch', md: 'center' }}
                      gap={4}
                    >
                      <HStack spacing={4}>
                        <Input
                          placeholder={t('admin.searchLogs')}
                          value={logFilter}
                          onChange={(e) => setLogFilter(e.target.value)}
                          width={{ base: 'full', md: '300px' }}
                          leftElement={<Box pl={2}><FaSearch color="gray.300" /></Box>}
                        />
                        
                        <Select
                          placeholder={t('admin.filterByLevel')}
                          value={logLevelFilter}
                          onChange={(e) => setLogLevelFilter(e.target.value)}
                          width={{ base: 'full', md: '200px' }}
                        >
                          <option value="">All Levels</option>
                          <option value="INFO">INFO</option>
                          <option value="WARNING">WARNING</option>
                          <option value="ERROR">ERROR</option>
                          <option value="CRITICAL">CRITICAL</option>
                        </Select>
                      </HStack>
                      
                      <Button leftIcon={<FaChartLine />} colorScheme="purple">
                        {t('admin.exportLogs')}
                      </Button>
                    </Flex>
                    
                    {isLoadingLogs ? (
                      <Box textAlign="center" py={10}>
                        <Spinner size="xl" color="purple.500" />
                        <Text mt={4}>{t('admin.loadingLogs')}</Text>
                      </Box>
                    ) : logs.length > 0 ? (
                      <Box overflowX="auto">
                        <Table variant="simple">
                          <Thead>
                            <Tr>
                              <Th>{t('admin.timestamp')}</Th>
                              <Th>{t('admin.level')}</Th>
                              <Th>{t('admin.source')}</Th>
                              <Th>{t('admin.message')}</Th>
                            </Tr>
                          </Thead>
                          <Tbody>
                            {logs.map((log) => (
                              <Tr key={log.id}>
                                <Td>{new Date(log.timestamp).toLocaleString()}</Td>
                                <Td>
                                  <Badge 
                                    colorScheme={
                                      log.level === 'ERROR' || log.level === 'CRITICAL' ? 'red' : 
                                      log.level === 'WARNING' ? 'yellow' : 
                                      'green'
                                    }
                                  >
                                    {log.level}
                                  </Badge>
                                </Td>
                                <Td>{log.source}</Td>
                                <Td>
                                  <Text noOfLines={2}>{log.message}</Text>
                                </Td>
                              </Tr>
                            ))}
                          </Tbody>
                        </Table>
                      </Box>
                    ) : (
                      <Box textAlign="center" py={10}>
                        <Text>{t('admin.noLogsFound')}</Text>
                      </Box>
                    )}
                  </VStack>
                </TabPanel>
              </TabPanels>
            </Tabs>
          </VStack>
        </Container>
      </Box>
      
      {/* Edit User Modal */}
      <Modal isOpen={isEditUserOpen} onClose={onEditUserClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>{t('admin.editUser')}: {selectedUser?.name}</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              <FormControl>
                <FormLabel>{t('admin.role')}</FormLabel>
                <Select
                  value={editUserForm.role}
                  onChange={(e) => setEditUserForm({...editUserForm, role: e.target.value})}
                >
                  <option value="free">Free</option>
                  <option value="pro">Pro</option>
                  <option value="admin">Admin</option>
                </Select>
              </FormControl>
              
              <FormControl>
                <FormLabel>{t('admin.credits')}</FormLabel>
                <Input
                  type="number"
                  value={editUserForm.credits}
                  onChange={(e) => setEditUserForm({...editUserForm, credits: parseInt(e.target.value)})}
                />
              </FormControl>
              
              <FormControl>
                <FormLabel>{t('admin.language')}</FormLabel>
                <Select
                  value={editUserForm.language_preference}
                  onChange={(e) => setEditUserForm({...editUserForm, language_preference: e.target.value})}
                >
                  <option value="en">English</option>
                  <option value="es">Spanish</option>
                  <option value="pt">Portuguese</option>
                  <option value="fa">Persian</option>
                </Select>
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onEditUserClose}>
              {t('admin.cancel')}
            </Button>
            <Button colorScheme="blue" onClick={submitEditUser}>
              {t('admin.save')}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
      
      {/* Reset Password Modal */}
      <Modal isOpen={isResetPasswordOpen} onClose={onResetPasswordClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>{t('admin.resetPassword')}</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Text>
              {t('admin.resetPasswordConfirm', { name: selectedUser?.name })}
            </Text>
            <Text mt={4} fontWeight="bold">
              {t('admin.resetPasswordWarning')}
            </Text>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onResetPasswordClose}>
              {t('admin.cancel')}
            </Button>
            <Button colorScheme="yellow" onClick={submitResetPassword}>
              {t('admin.resetPassword')}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
      
      {/* Delete User Modal */}
      <Modal isOpen={isDeleteUserOpen} onClose={onDeleteUserClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>{t('admin.deleteUser')}</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Text>
              {t('admin.deleteUserConfirm', { name: selectedUser?.name })}
            </Text>
            <Text mt={4} fontWeight="bold" color="red.500">
              {t('admin.deleteUserWarning')}
            </Text>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onDeleteUserClose}>
              {t('admin.cancel')}
            </Button>
            <Button colorScheme="red" onClick={submitDeleteUser}>
              {t('admin.delete')}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}
