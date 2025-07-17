import React, { useState, useEffect } from 'react';
import { GetServerSideProps } from 'next';
import { getSession } from 'next-auth/react';
import {
  Box,
  Heading,
  Text,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Badge,
  Button,
  HStack,
  VStack,
  Flex,
  Select,
  Input,
  IconButton,
  useToast,
  Spinner,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Stat,
  StatLabel,
  StatNumber,
  StatGroup,
  SimpleGrid,
  useColorModeValue,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
} from '@chakra-ui/react';
import { FiTrash2, FiRefreshCw, FiFilter, FiSearch, FiInfo } from 'react-icons/fi';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { http } from '@/utils/httpMiddleware';
import { useApiError } from '@/hooks/useApiError';
import { ErrorType, ErrorSeverity } from '@/utils/errorHandler';
import { logger, LogCategory } from '@/utils/logger';

// Types
interface ErrorLog {
  id: number;
  error_type: string;
  message: string;
  severity: string;
  code?: string;
  request_id?: string;
  path?: string;
  timestamp: string;
  details?: any;
}

interface ErrorSummary {
  total_errors: number;
  errors_by_type: Record<string, number>;
  errors_by_severity: Record<string, number>;
  errors_by_day: Record<string, number>;
  most_common_errors: Array<{
    error_type: string;
    code?: string;
    count: number;
    example_message: string;
  }>;
}

// Helper function to format date
const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('fa-IR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

// Helper function to get badge color based on severity
const getSeverityColor = (severity: string) => {
  switch (severity) {
    case 'critical':
      return 'red';
    case 'error':
      return 'orange';
    case 'warning':
      return 'yellow';
    case 'info':
      return 'blue';
    default:
      return 'gray';
  }
};

// Helper function to get badge color based on error type
const getErrorTypeColor = (type: string) => {
  switch (type) {
    case 'validation_error':
      return 'purple';
    case 'authentication_error':
      return 'red';
    case 'authorization_error':
      return 'orange';
    case 'resource_not_found':
      return 'yellow';
    case 'rate_limit_error':
      return 'pink';
    case 'dependency_error':
      return 'cyan';
    case 'internal_error':
      return 'red';
    case 'external_service_error':
      return 'teal';
    case 'unexpected_error':
      return 'red';
    case 'business_logic_error':
      return 'blue';
    default:
      return 'gray';
  }
};

const ErrorsPage = () => {
  // State
  const [errors, setErrors] = useState<ErrorLog[]>([]);
  const [summary, setSummary] = useState<ErrorSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [selectedError, setSelectedError] = useState<ErrorLog | null>(null);
  const [filterType, setFilterType] = useState<string>('');
  const [filterSeverity, setFilterSeverity] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [timeRange, setTimeRange] = useState<string>('7');
  
  // Hooks
  const toast = useToast();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { handleApiError } = useApiError();
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  
  // Fetch errors
  const fetchErrors = async () => {
    try {
      setLoading(true);
      
      // Build query parameters
      const params = new URLSearchParams();
      if (filterType) params.append('error_type', filterType);
      if (filterSeverity) params.append('severity', filterSeverity);
      if (searchQuery) params.append('path', searchQuery);
      
      const response = await http.get<ErrorLog[]>(`/api/errors?${params.toString()}`);
      setErrors(response.data);
      
      logger.info(LogCategory.USER_ACTION, 'Admin fetched error logs', {
        filters: { type: filterType, severity: filterSeverity, search: searchQuery }
      });
    } catch (error) {
      handleApiError(error);
    } finally {
      setLoading(false);
    }
  };
  
  // Fetch error summary
  const fetchErrorSummary = async () => {
    try {
      setSummaryLoading(true);
      const response = await http.get<ErrorSummary>(`/api/errors/summary?days=${timeRange}`);
      setSummary(response.data);
      
      logger.info(LogCategory.USER_ACTION, 'Admin fetched error summary', {
        timeRange
      });
    } catch (error) {
      handleApiError(error);
    } finally {
      setSummaryLoading(false);
    }
  };
  
  // Delete error
  const deleteError = async (id: number) => {
    try {
      await http.delete(`/api/errors/${id}`);
      
      // Remove from state
      setErrors(errors.filter(error => error.id !== id));
      
      // Show success message
      toast({
        title: 'خطا حذف شد',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      
      logger.info(LogCategory.USER_ACTION, 'Admin deleted error log', { errorId: id });
      
      // Refresh summary
      fetchErrorSummary();
    } catch (error) {
      handleApiError(error);
    }
  };
  
  // Clear errors
  const clearErrors = async () => {
    try {
      // Build query parameters
      const params = new URLSearchParams();
      if (filterType) params.append('error_type', filterType);
      if (filterSeverity) params.append('severity', filterSeverity);
      if (timeRange) params.append('days', timeRange);
      
      await http.delete(`/api/errors?${params.toString()}`);
      
      // Refresh data
      fetchErrors();
      fetchErrorSummary();
      
      // Show success message
      toast({
        title: 'خطاها پاک شدند',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      
      logger.info(LogCategory.USER_ACTION, 'Admin cleared error logs', {
        filters: { type: filterType, severity: filterSeverity, timeRange }
      });
    } catch (error) {
      handleApiError(error);
    }
  };
  
  // View error details
  const viewErrorDetails = (error: ErrorLog) => {
    setSelectedError(error);
    onOpen();
  };
  
  // Initial data load
  useEffect(() => {
    fetchErrors();
    fetchErrorSummary();
  }, []);
  
  // Refresh data when filters change
  useEffect(() => {
    fetchErrors();
  }, [filterType, filterSeverity, searchQuery]);
  
  // Refresh summary when time range changes
  useEffect(() => {
    fetchErrorSummary();
  }, [timeRange]);
  
  return (
    <DashboardLayout title="مدیریت خطاها">
      <Tabs variant="enclosed" colorScheme="brand">
        <TabList>
          <Tab>لیست خطاها</Tab>
          <Tab>آمار و تحلیل</Tab>
        </TabList>
        
        <TabPanels>
          {/* Error List Tab */}
          <TabPanel px="0">
            <VStack spacing="6" align="stretch">
              {/* Filters */}
              <Flex 
                direction={{ base: 'column', md: 'row' }} 
                justify="space-between" 
                align={{ base: 'stretch', md: 'center' }}
                gap="4"
                p="4"
                bg={bgColor}
                borderWidth="1px"
                borderColor={borderColor}
                borderRadius="md"
              >
                <HStack>
                  <Select 
                    placeholder="نوع خطا" 
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    maxW="200px"
                  >
                    <option value="validation_error">خطای اعتبارسنجی</option>
                    <option value="authentication_error">خطای احراز هویت</option>
                    <option value="authorization_error">خطای مجوز</option>
                    <option value="resource_not_found">منبع یافت نشد</option>
                    <option value="rate_limit_error">محدودیت نرخ</option>
                    <option value="dependency_error">خطای وابستگی</option>
                    <option value="internal_error">خطای داخلی</option>
                    <option value="external_service_error">خطای سرویس خارجی</option>
                    <option value="unexpected_error">خطای غیرمنتظره</option>
                    <option value="business_logic_error">خطای منطق کسب و کار</option>
                  </Select>
                  
                  <Select 
                    placeholder="شدت خطا" 
                    value={filterSeverity}
                    onChange={(e) => setFilterSeverity(e.target.value)}
                    maxW="150px"
                  >
                    <option value="info">اطلاعات</option>
                    <option value="warning">هشدار</option>
                    <option value="error">خطا</option>
                    <option value="critical">بحرانی</option>
                  </Select>
                  
                  <IconButton
                    aria-label="پاک کردن فیلترها"
                    icon={<FiRefreshCw />}
                    onClick={() => {
                      setFilterType('');
                      setFilterSeverity('');
                      setSearchQuery('');
                    }}
                  />
                </HStack>
                
                <HStack>
                  <Input
                    placeholder="جستجو بر اساس مسیر"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    maxW="300px"
                  />
                  <IconButton
                    aria-label="جستجو"
                    icon={<FiSearch />}
                    onClick={fetchErrors}
                  />
                </HStack>
                
                <Button 
                  colorScheme="red" 
                  leftIcon={<FiTrash2 />}
                  onClick={clearErrors}
                >
                  پاک کردن خطاها
                </Button>
              </Flex>
              
              {/* Error Table */}
              <Box
                bg={bgColor}
                borderWidth="1px"
                borderColor={borderColor}
                borderRadius="md"
                overflow="hidden"
              >
                {loading ? (
                  <Flex justify="center" align="center" p="10">
                    <Spinner size="xl" color="brand.500" />
                  </Flex>
                ) : errors.length === 0 ? (
                  <Flex justify="center" align="center" p="10" direction="column">
                    <Text fontSize="lg" mb="4">هیچ خطایی یافت نشد</Text>
                    <Button
                      leftIcon={<FiRefreshCw />}
                      onClick={fetchErrors}
                    >
                      بارگذاری مجدد
                    </Button>
                  </Flex>
                ) : (
                  <Table variant="simple">
                    <Thead>
                      <Tr>
                        <Th>شناسه</Th>
                        <Th>نوع</Th>
                        <Th>پیام</Th>
                        <Th>شدت</Th>
                        <Th>کد</Th>
                        <Th>زمان</Th>
                        <Th>عملیات</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {errors.map((error) => (
                        <Tr key={error.id}>
                          <Td>{error.id}</Td>
                          <Td>
                            <Badge colorScheme={getErrorTypeColor(error.error_type)}>
                              {error.error_type}
                            </Badge>
                          </Td>
                          <Td maxW="300px" isTruncated>{error.message}</Td>
                          <Td>
                            <Badge colorScheme={getSeverityColor(error.severity)}>
                              {error.severity}
                            </Badge>
                          </Td>
                          <Td>{error.code || '-'}</Td>
                          <Td>{formatDate(error.timestamp)}</Td>
                          <Td>
                            <HStack spacing="2">
                              <IconButton
                                aria-label="مشاهده جزئیات"
                                icon={<FiInfo />}
                                size="sm"
                                onClick={() => viewErrorDetails(error)}
                              />
                              <IconButton
                                aria-label="حذف خطا"
                                icon={<FiTrash2 />}
                                colorScheme="red"
                                size="sm"
                                onClick={() => deleteError(error.id)}
                              />
                            </HStack>
                          </Td>
                        </Tr>
                      ))}
                    </Tbody>
                  </Table>
                )}
              </Box>
            </VStack>
          </TabPanel>
          
          {/* Analytics Tab */}
          <TabPanel px="0">
            <VStack spacing="6" align="stretch">
              {/* Time Range Selector */}
              <Flex justify="space-between" align="center">
                <Heading size="md">آمار خطاها</Heading>
                <HStack>
                  <Text>بازه زمانی:</Text>
                  <Select 
                    value={timeRange} 
                    onChange={(e) => setTimeRange(e.target.value)}
                    w="150px"
                  >
                    <option value="1">۱ روز گذشته</option>
                    <option value="7">۷ روز گذشته</option>
                    <option value="30">۳۰ روز گذشته</option>
                    <option value="90">۹۰ روز گذشته</option>
                  </Select>
                  <IconButton
                    aria-label="بارگذاری مجدد"
                    icon={<FiRefreshCw />}
                    onClick={fetchErrorSummary}
                  />
                </HStack>
              </Flex>
              
              {/* Summary Stats */}
              {summaryLoading ? (
                <Flex justify="center" align="center" p="10">
                  <Spinner size="xl" color="brand.500" />
                </Flex>
              ) : summary ? (
                <VStack spacing="6" align="stretch">
                  {/* Stats Overview */}
                  <StatGroup>
                    <SimpleGrid columns={{ base: 1, md: 4 }} spacing="4" width="full">
                      <Stat
                        p="4"
                        bg={bgColor}
                        borderWidth="1px"
                        borderColor={borderColor}
                        borderRadius="md"
                      >
                        <StatLabel>تعداد کل خطاها</StatLabel>
                        <StatNumber>{summary.total_errors}</StatNumber>
                      </Stat>
                      
                      <Stat
                        p="4"
                        bg={bgColor}
                        borderWidth="1px"
                        borderColor={borderColor}
                        borderRadius="md"
                      >
                        <StatLabel>خطاهای بحرانی</StatLabel>
                        <StatNumber>{summary.errors_by_severity.critical || 0}</StatNumber>
                      </Stat>
                      
                      <Stat
                        p="4"
                        bg={bgColor}
                        borderWidth="1px"
                        borderColor={borderColor}
                        borderRadius="md"
                      >
                        <StatLabel>خطاهای داخلی</StatLabel>
                        <StatNumber>{summary.errors_by_type.internal_error || 0}</StatNumber>
                      </Stat>
                      
                      <Stat
                        p="4"
                        bg={bgColor}
                        borderWidth="1px"
                        borderColor={borderColor}
                        borderRadius="md"
                      >
                        <StatLabel>خطاهای اعتبارسنجی</StatLabel>
                        <StatNumber>{summary.errors_by_type.validation_error || 0}</StatNumber>
                      </Stat>
                    </SimpleGrid>
                  </StatGroup>
                  
                  {/* Most Common Errors */}
                  <Box
                    p="4"
                    bg={bgColor}
                    borderWidth="1px"
                    borderColor={borderColor}
                    borderRadius="md"
                  >
                    <Heading size="md" mb="4">شایع‌ترین خطاها</Heading>
                    <Table variant="simple">
                      <Thead>
                        <Tr>
                          <Th>نوع خطا</Th>
                          <Th>کد</Th>
                          <Th>تعداد</Th>
                          <Th>پیام نمونه</Th>
                        </Tr>
                      </Thead>
                      <Tbody>
                        {summary.most_common_errors.map((error, index) => (
                          <Tr key={index}>
                            <Td>
                              <Badge colorScheme={getErrorTypeColor(error.error_type)}>
                                {error.error_type}
                              </Badge>
                            </Td>
                            <Td>{error.code || '-'}</Td>
                            <Td>{error.count}</Td>
                            <Td maxW="300px" isTruncated>{error.example_message}</Td>
                          </Tr>
                        ))}
                      </Tbody>
                    </Table>
                  </Box>
                  
                  {/* Error Distribution */}
                  <SimpleGrid columns={{ base: 1, md: 2 }} spacing="4">
                    {/* By Type */}
                    <Box
                      p="4"
                      bg={bgColor}
                      borderWidth="1px"
                      borderColor={borderColor}
                      borderRadius="md"
                    >
                      <Heading size="md" mb="4">توزیع بر اساس نوع</Heading>
                      <Table variant="simple" size="sm">
                        <Thead>
                          <Tr>
                            <Th>نوع خطا</Th>
                            <Th isNumeric>تعداد</Th>
                          </Tr>
                        </Thead>
                        <Tbody>
                          {Object.entries(summary.errors_by_type).map(([type, count]) => (
                            <Tr key={type}>
                              <Td>
                                <Badge colorScheme={getErrorTypeColor(type)}>
                                  {type}
                                </Badge>
                              </Td>
                              <Td isNumeric>{count}</Td>
                            </Tr>
                          ))}
                        </Tbody>
                      </Table>
                    </Box>
                    
                    {/* By Severity */}
                    <Box
                      p="4"
                      bg={bgColor}
                      borderWidth="1px"
                      borderColor={borderColor}
                      borderRadius="md"
                    >
                      <Heading size="md" mb="4">توزیع بر اساس شدت</Heading>
                      <Table variant="simple" size="sm">
                        <Thead>
                          <Tr>
                            <Th>شدت</Th>
                            <Th isNumeric>تعداد</Th>
                          </Tr>
                        </Thead>
                        <Tbody>
                          {Object.entries(summary.errors_by_severity).map(([severity, count]) => (
                            <Tr key={severity}>
                              <Td>
                                <Badge colorScheme={getSeverityColor(severity)}>
                                  {severity}
                                </Badge>
                              </Td>
                              <Td isNumeric>{count}</Td>
                            </Tr>
                          ))}
                        </Tbody>
                      </Table>
                    </Box>
                  </SimpleGrid>
                </VStack>
              ) : (
                <Flex justify="center" align="center" p="10">
                  <Text>خطا در بارگذاری آمار</Text>
                </Flex>
              )}
            </VStack>
          </TabPanel>
        </TabPanels>
      </Tabs>
      
      {/* Error Details Modal */}
      <Modal isOpen={isOpen} onClose={onClose} size="xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>جزئیات خطا</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {selectedError && (
              <VStack align="stretch" spacing="4">
                <Flex justify="space-between">
                  <Badge colorScheme={getErrorTypeColor(selectedError.error_type)}>
                    {selectedError.error_type}
                  </Badge>
                  <Badge colorScheme={getSeverityColor(selectedError.severity)}>
                    {selectedError.severity}
                  </Badge>
                </Flex>
                
                <Box>
                  <Text fontWeight="bold">پیام:</Text>
                  <Text>{selectedError.message}</Text>
                </Box>
                
                {selectedError.code && (
                  <Box>
                    <Text fontWeight="bold">کد:</Text>
                    <Text>{selectedError.code}</Text>
                  </Box>
                )}
                
                <Box>
                  <Text fontWeight="bold">زمان:</Text>
                  <Text>{formatDate(selectedError.timestamp)}</Text>
                </Box>
                
                {selectedError.path && (
                  <Box>
                    <Text fontWeight="bold">مسیر:</Text>
                    <Text>{selectedError.path}</Text>
                  </Box>
                )}
                
                {selectedError.request_id && (
                  <Box>
                    <Text fontWeight="bold">شناسه درخواست:</Text>
                    <Text>{selectedError.request_id}</Text>
                  </Box>
                )}
                
                {selectedError.details && (
                  <Box>
                    <Text fontWeight="bold">جزئیات:</Text>
                    <Box
                      p="3"
                      bg="gray.50"
                      borderRadius="md"
                      fontFamily="monospace"
                      fontSize="sm"
                      whiteSpace="pre-wrap"
                      overflowX="auto"
                    >
                      {JSON.stringify(selectedError.details, null, 2)}
                    </Box>
                  </Box>
                )}
              </VStack>
            )}
          </ModalBody>
          <ModalFooter>
            <Button colorScheme="blue" mr={3} onClick={onClose}>
              بستن
            </Button>
            {selectedError && (
              <Button 
                colorScheme="red" 
                onClick={() => {
                  deleteError(selectedError.id);
                  onClose();
                }}
              >
                حذف خطا
              </Button>
            )}
          </ModalFooter>
        </ModalContent>
      </Modal>
    </DashboardLayout>
  );
};

export const getServerSideProps: GetServerSideProps = async (context) => {
  const session = await getSession(context);
  
  // Check if user is authenticated and has admin role
  if (!session || session.user.role !== 'admin') {
    return {
      redirect: {
        destination: '/auth/login?callbackUrl=/admin/errors',
        permanent: false,
      },
    };
  }
  
  return {
    props: {},
  };
};

export default ErrorsPage;
