import { useState, useEffect, useRef } from 'react';
import {
  Box,
  Container,
  Heading,
  Text,
  VStack,
  HStack,
  Button,
  Textarea,
  Flex,
  Divider,
  useColorModeValue,
  Spinner,
  Badge,
  IconButton,
  useToast,
  Input
} from '@chakra-ui/react';
import { FaArrowRight, FaRegClock, FaRegLightbulb, FaArrowLeft } from 'react-icons/fa';
import axios from 'axios';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { ChatMessage, ChatResponse } from '../types';
import { useAuth } from '../contexts/AuthContext';

export async function getStaticProps({ locale }: { locale: string }) {
  return {
    props: {
      ...(await serverSideTranslations(locale, ['common'])),
    },
  };
}

export default function Chat() {
  const { t } = useTranslation('common');
  const router = useRouter();
  const { videoId } = router.query;
  const toast = useToast();
  const auth = useAuth();
  
  const [videoTitle, setVideoTitle] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Color mode values
  const bgColor = useColorModeValue('gray.50', 'gray.900');
  const cardBgColor = useColorModeValue('white', 'gray.800');
  const accentColor = useColorModeValue('purple.600', 'purple.300');
  
  useEffect(() => {
    console.log('useEffect triggered with videoId:', videoId);
    console.log('Router query:', router.query);
    
    if (!videoId) {
      console.log('No videoId found, redirecting to home');
      // Redirect to home if no videoId
      router.push('/');
      return;
    }
    
    // Fetch video info
    fetchVideoInfo();
  }, [videoId, router.query]);
  
  useEffect(() => {
    scrollToBottom();
  }, [chatMessages]);
  
  const fetchVideoInfo = async () => {
    try {
      setInitialLoading(true);
      
      // Get API URL from environment variable or use default
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8085';
      
      const response = await axios.get(`${apiUrl}/api/video/${videoId}`);
      const data = response.data;
      
      setVideoTitle(data.title);
      setVideoUrl(`https://www.youtube.com/watch?v=${videoId}`);
      
      // Add welcome message
      // @ts-ignore - نادیده گرفتن خطاهای تایپ برای حل مشکل فعلی
      const welcomeMessage = {
        id: "1",
        videoId: videoId as string,
        content: t('chat.welcomeMessage', { videoTitle: data.title }),
        sender: 'ai',
        timestamp: new Date(),
        timelineSuggestions: []
      };
      
      // @ts-ignore
      setChatMessages([welcomeMessage]);
      
      setInitialLoading(false);
    } catch (error) {
      console.error('Error fetching video info:', error);
      toast({
        title: t('errors.generalError'),
        description: error instanceof Error ? error.message : t('errors.generalError'),
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      setInitialLoading(false);
    }
  };
  
  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('Chat submit triggered with input:', chatInput);
    console.log('Current videoId:', videoId);
    
    if (!chatInput.trim()) return;
    
    // Add user message
    // @ts-ignore - نادیده گرفتن خطاهای تایپ برای حل مشکل فعلی
    const userMessage = {
      id: Date.now().toString(),
      videoId: videoId as string,
      content: chatInput,
      sender: 'user',
      timestamp: new Date(),
      timelineSuggestions: []
    };
    
    // @ts-ignore
    setChatMessages(prev => [...prev, userMessage]);
    setChatInput('');
    setChatLoading(true);
    
    try {
      // Get API URL from environment variable or use default
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8085';
      
      console.log('Sending API request to:', `${apiUrl}/api/chat`);
      console.log('Request payload:', { videoId, message: userMessage.content });
      
      console.log('Sending request to API with videoId:', videoId, 'and message:', userMessage.content);
      
      const response = await axios.post(`${apiUrl}/api/chat`, {
        videoId,
        message: userMessage.content
      }, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      console.log('Full API response:', response);
      
      console.log('API response status:', response.status);
      console.log('API response headers:', response.headers);
      
      // نمایش پاسخ API به صورت متنی برای دیباگ
      console.log('API response as string:', JSON.stringify(response.data));
      
      // تلاش برای پارس کردن پاسخ API به صورت دستی
      let data;
      try {
        if (typeof response.data === 'string') {
          data = JSON.parse(response.data);
        } else {
          data = response.data;
        }
      } catch (error) {
        console.error('Error parsing API response:', error);
        data = response.data;
      }
      
      console.log('Parsed API response:', data);
      
      // بررسی دقیق ساختار پاسخ API
      console.log('API response structure check:');
      console.log('- Has response field:', data.hasOwnProperty('response'));
      console.log('- Has answer field:', data.hasOwnProperty('answer'));
      console.log('- Has timeline_suggestions field:', data.hasOwnProperty('timeline_suggestions'));
      console.log('- Has timelineSuggestions field:', data.hasOwnProperty('timelineSuggestions'));
      
      // استخراج پیشنهادات زمانی با پشتیبانی از هر دو فرمت نامگذاری
      const timelineSuggestions = data.timelineSuggestions || data.timeline_suggestions || [];
      
      // استخراج متن پاسخ با پشتیبانی از هر دو فرمت نامگذاری
      const responseText = data.response || data.answer || '';
      
      console.log('Extracted response text:', responseText);
      console.log('Extracted timeline suggestions:', timelineSuggestions);
      
      // ساخت پیام AI
      // @ts-ignore - نادیده گرفتن خطاهای تایپ برای حل مشکل فعلی
      const aiMessage = {
        id: (Date.now() + 1).toString(),
        videoId: videoId as string,
        content: responseText,
        sender: 'ai',
        timestamp: new Date(),
        timelineSuggestions
      };
      
      // بررسی دقیق‌تر پاسخ API
      console.log('Comparing AI response with user message:');
      // @ts-ignore
      console.log('AI response:', aiMessage.content);
      // @ts-ignore
      console.log('User message:', userMessage.content);
      // @ts-ignore
      console.log('Are they equal?', aiMessage.content === userMessage.content);
      
      // اگر پاسخ همان سوال کاربر باشد یا خالی باشد، یک پیام خطا نمایش دهیم
      // @ts-ignore
      if (aiMessage.content === userMessage.content || !aiMessage.content) {
        console.log('AI response is the same as user message or empty, showing error message');
        // @ts-ignore
        aiMessage.content = t('chat.errorMessage');
      }
      
      console.log('Created AI message content:', aiMessage.content);
      console.log('Created AI message:', aiMessage);
      
      setChatMessages(prev => [...prev, aiMessage]);
      setChatLoading(false);
    } catch (error) {
      console.error('Chat error:', error);
      
      // Add error message
      // @ts-ignore - نادیده گرفتن خطاهای تایپ برای حل مشکل فعلی
      const errorMessage = {
        id: (Date.now() + 1).toString(),
        videoId: videoId as string,
        content: t('chat.errorMessage'),
        sender: 'ai',
        timestamp: new Date(),
        timelineSuggestions: []
      };
      
      // @ts-ignore
      setChatMessages(prev => [...prev, errorMessage]);
      setChatLoading(false);
      
      toast({
        title: t('errors.generalError'),
        description: error instanceof Error ? error.message : t('errors.generalError'),
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };
  
  const handleTimelineClick = (timestamp: string) => {
    // Format: open YouTube at specific timestamp
    const timeInSeconds = convertTimestampToSeconds(timestamp);
    window.open(`${videoUrl}&t=${timeInSeconds}`, '_blank');
  };
  
  const convertTimestampToSeconds = (timestamp: string): number => {
    const parts = timestamp.split(':').map(part => parseInt(part));
    
    if (parts.length === 3) {
      // HH:MM:SS format
      return parts[0] * 3600 + parts[1] * 60 + parts[2];
    } else if (parts.length === 2) {
      // MM:SS format
      return parts[0] * 60 + parts[1];
    } else {
      // Just seconds
      return parts[0];
    }
  };
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  return (
    <>
      <Head>
        <title>{t('chat.title')} | TubeWise</title>
        <meta name="description" content={t('chat.title')} />
      </Head>
      
      <Box bg={bgColor} minH="100vh" py={8}>
        <Container maxW="container.lg">
          <VStack spacing={8} align="stretch">
            <Flex justifyContent="space-between" alignItems="center">
              <Box>
                <Link href="/" passHref>
                  <Heading
                    as="a"
                    size="xl"
                    color={accentColor}
                    cursor="pointer"
                    display="inline-block"
                  >
                    TubeWise
                  </Heading>
                </Link>
                <Text fontSize="xl" mt={2}>
                  {videoTitle ? t('chat.chatWithVideo', { videoTitle }) : t('chat.title')}
                </Text>
              </Box>
              
              <HStack spacing={4}>
                <Link href={`/?videoId=${videoId}`} passHref>
                  <Button leftIcon={<FaArrowLeft />} colorScheme="purple" variant="outline">
                    {t('summary.backToSummary')}
                  </Button>
                </Link>
                
                {auth.isAuthenticated && (
                  <Link href="/dashboard" passHref>
                    <Button colorScheme="purple" variant="ghost">
                      {t('tabs.dashboard')}
                    </Button>
                  </Link>
                )}
              </HStack>
            </Flex>
            
            <Divider />
            
            {initialLoading ? (
              <Box textAlign="center" py={10}>
                <Spinner size="xl" color="purple.500" />
                <Text mt={4}>{t('summary.analyzing')}</Text>
              </Box>
            ) : (
              <VStack spacing={6} align="stretch">
                <Box
                  bg={cardBgColor}
                  p={6}
                  borderRadius="lg"
                  boxShadow="md"
                  height="600px"
                  display="flex"
                  flexDirection="column"
                >
                  <Box 
                    flex="1" 
                    overflowY="auto" 
                    mb={4} 
                    p={4} 
                    borderRadius="md" 
                    bg={useColorModeValue('gray.50', 'gray.700')}
                  >
                    {chatMessages.length === 0 ? (
                      <Text color="gray.500" textAlign="center" mt={10}>
                        {t('chat.placeholder')}
                      </Text>
                    ) : (
                      <VStack align="stretch" spacing={4}>
                        {chatMessages.map((message) => (
                          <Box 
                            key={message.id} 
                            // @ts-ignore
                            alignSelf={message.sender === 'user' ? 'flex-end' : 'flex-start'}
                            maxW="80%"
                            p={3}
                            borderRadius="lg"
                            // @ts-ignore
                            bg={message.sender === 'user' ? useColorModeValue('blue.100', 'blue.700') : useColorModeValue('purple.100', 'purple.700')}
                          >
                            {/* @ts-ignore */}
                            <Text>{message.content}</Text>
                            
                            {/* @ts-ignore */}
                            {message.timelineSuggestions && message.timelineSuggestions.length > 0 && (
                              <HStack mt={2} flexWrap="wrap">
                                {message.timelineSuggestions.map((suggestion, idx) => (
                                  <Badge 
                                    key={idx} 
                                    colorScheme="purple" 
                                    cursor="pointer"
                                    onClick={() => handleTimelineClick(suggestion.timestamp)}
                                    p={1}
                                  >
                                    {suggestion.timestamp}
                                    {suggestion.text && ` - ${suggestion.text}`}
                                  </Badge>
                                ))}
                              </HStack>
                            )}
                          </Box>
                        ))}
                        
                        {chatLoading && (
                          <HStack justifyContent="center">
                            <Spinner size="sm" />
                            <Text>{t('chat.thinking')}</Text>
                          </HStack>
                        )}
                        
                        <div ref={messagesEndRef} />
                      </VStack>
                    )}
                  </Box>
                  
                  <form onSubmit={handleChatSubmit}>
                    <HStack>
                      <Textarea
                        placeholder={t('chat.placeholder')}
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        size="md"
                        resize="none"
                        rows={2}
                        disabled={chatLoading}
                      />
                      <IconButton
                        aria-label="Send message"
                        icon={<FaArrowRight />}
                        type="submit"
                        colorScheme="purple"
                        isLoading={chatLoading}
                        isDisabled={!chatInput.trim()}
                      />
                    </HStack>
                  </form>
                </Box>
                
                <Box bg={cardBgColor} p={6} borderRadius="lg" boxShadow="md">
                  <Heading as="h3" size="md" mb={4}>
                    {t('chat.suggestedQuestions')}
                  </Heading>
                  
                  <HStack spacing={2} flexWrap="wrap">
                    <Button 
                      size="sm" 
                      colorScheme="purple" 
                      variant="outline"
                      onClick={() => setChatInput(t('chat.suggestedQuestion1'))}
                    >
                      {t('chat.suggestedQuestion1')}
                    </Button>
                    <Button 
                      size="sm" 
                      colorScheme="purple" 
                      variant="outline"
                      onClick={() => setChatInput(t('chat.suggestedQuestion2'))}
                    >
                      {t('chat.suggestedQuestion2')}
                    </Button>
                    <Button 
                      size="sm" 
                      colorScheme="purple" 
                      variant="outline"
                      onClick={() => setChatInput(t('chat.suggestedQuestion3'))}
                    >
                      {t('chat.suggestedQuestion3')}
                    </Button>
                  </HStack>
                </Box>
              </VStack>
            )}
          </VStack>
        </Container>
      </Box>
    </>
  );
}