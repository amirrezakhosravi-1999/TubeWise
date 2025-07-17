import { useState, useEffect } from 'react';
import {
  Box,
  Flex,
  Text,
  Button,
  Stack,
  Collapse,
  Icon,
  Link as ChakraLink,
  Popover,
  PopoverTrigger,
  PopoverContent,
  useColorModeValue,
  useBreakpointValue,
  useDisclosure,
  IconButton,
  Container,
  useColorMode,
} from '@chakra-ui/react';
import {
  HamburgerIcon,
  CloseIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  MoonIcon,
  SunIcon,
} from '@chakra-ui/icons';
import { useTranslation } from 'next-i18next';
import NextLink from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '../contexts/AuthContext';

export default function Header() {
  const { isOpen, onToggle } = useDisclosure();
  const { colorMode, toggleColorMode } = useColorMode();
  const { t } = useTranslation('common');
  const router = useRouter();
  const auth = useAuth();
  const [isScrolled, setIsScrolled] = useState(false);

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      const offset = window.scrollY;
      if (offset > 50) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  return (
    <Box
      position="sticky"
      top="0"
      zIndex="1000"
      transition="all 0.3s ease"
      bg={useColorModeValue(
        isScrolled ? 'white' : 'transparent',
        isScrolled ? 'gray.800' : 'transparent'
      )}
      boxShadow={isScrolled ? 'sm' : 'none'}
      borderBottom={isScrolled ? '1px' : '0px'}
      borderColor={useColorModeValue('gray.200', 'gray.700')}
    >
      <Container maxW="container.xl">
        <Flex
          color={useColorModeValue('gray.600', 'white')}
          minH={'60px'}
          py={{ base: 2 }}
          px={{ base: 4 }}
          align={'center'}
        >
          <Flex
            flex={{ base: 1, md: 'auto' }}
            ml={{ base: -2 }}
            display={{ base: 'flex', md: 'none' }}
          >
            <IconButton
              onClick={onToggle}
              icon={
                isOpen ? <CloseIcon w={3} h={3} /> : <HamburgerIcon w={5} h={5} />
              }
              variant={'ghost'}
              aria-label={'Toggle Navigation'}
            />
          </Flex>
          <Flex flex={{ base: 1 }} justify={{ base: 'center', md: 'start' }}>
            <NextLink href="/" legacyBehavior>
              <Text
                as="a"
                textAlign={useBreakpointValue({ base: 'center', md: 'left' })}
                fontFamily={'heading'}
                fontWeight="bold"
                fontSize="xl"
                color={useColorModeValue('purple.600', 'purple.300')}
                cursor="pointer"
              >
                TubeWise
              </Text>
            </NextLink>

            <Flex display={{ base: 'none', md: 'flex' }} ml={10}>
              <DesktopNav />
            </Flex>
          </Flex>

          <Stack
            flex={{ base: 1, md: 0 }}
            justify={'flex-end'}
            direction={'row'}
            spacing={6}
          >
            <Button onClick={toggleColorMode} variant="ghost" size="sm">
              {colorMode === 'light' ? <MoonIcon /> : <SunIcon />}
            </Button>
            
            {auth.user ? (
              <Stack direction={'row'} spacing={4} align={'center'}>
                <NextLink href="/dashboard" legacyBehavior passHref>
                  <Button 
                    as="a"
                    fontSize={'sm'} 
                    fontWeight={500} 
                    variant={'ghost'}
                  >
                    {t('tabs.dashboard')}
                  </Button>
                </NextLink>
                <Button
                  fontSize={'sm'}
                  fontWeight={600}
                  color={'white'}
                  bg={'purple.500'}
                  _hover={{
                    bg: 'purple.600',
                  }}
                  onClick={() => {
                    auth.logout();
                    router.push('/');
                  }}
                >
                  {t('auth.logout')}
                </Button>
              </Stack>
            ) : (
              <Stack direction={'row'} spacing={4}>
                <NextLink href="/login" legacyBehavior passHref>
                  <Button 
                    as="a"
                    fontSize={'sm'} 
                    fontWeight={400} 
                    variant={'link'}
                  >
                    {t('auth.login')}
                  </Button>
                </NextLink>
                <NextLink href="/signup" legacyBehavior passHref>
                  <Button
                    as="a"
                    display={{ base: 'none', md: 'inline-flex' }}
                    fontSize={'sm'}
                    fontWeight={600}
                    color={'white'}
                    bg={'purple.500'}
                    _hover={{
                      bg: 'purple.600',
                    }}
                  >
                    {t('auth.signup')}
                  </Button>
                </NextLink>
              </Stack>
            )}
          </Stack>
        </Flex>

        <Collapse in={isOpen} animateOpacity>
          <MobileNav />
        </Collapse>
      </Container>
    </Box>
  );
}

const DesktopNav = () => {
  const linkColor = useColorModeValue('gray.600', 'gray.200');
  const linkHoverColor = useColorModeValue('purple.600', 'purple.300');
  const popoverContentBgColor = useColorModeValue('white', 'gray.800');
  const { t } = useTranslation('common');

  return (
    <Stack direction={'row'} spacing={4}>
      {NAV_ITEMS.map((navItem) => (
        <Box key={navItem.label}>
          <Popover trigger={'hover'} placement={'bottom-start'}>
            <PopoverTrigger>
              <NextLink href={navItem.href ?? '#'} legacyBehavior passHref>
                <ChakraLink
                  p={2}
                  fontSize={'sm'}
                  fontWeight={500}
                  color={linkColor}
                  _hover={{
                    textDecoration: 'none',
                    color: linkHoverColor,
                  }}
                >
                  {navItem.label}
                  {navItem.children && (
                    <Icon
                      as={ChevronDownIcon}
                      w={5}
                      h={5}
                      ml={1}
                      transition={'all .25s ease-in-out'}
                    />
                  )}
                </ChakraLink>
              </NextLink>
            </PopoverTrigger>

            {navItem.children && (
              <PopoverContent
                border={0}
                boxShadow={'xl'}
                bg={popoverContentBgColor}
                p={4}
                rounded={'xl'}
                minW={'sm'}
              >
                <Stack>
                  {navItem.children.map((child) => (
                    <DesktopSubNav key={child.label} {...child} />
                  ))}
                </Stack>
              </PopoverContent>
            )}
          </Popover>
        </Box>
      ))}
    </Stack>
  );
};

const DesktopSubNav = ({ label, href, subLabel }: NavItem) => {
  const { t } = useTranslation('common');
  return (
    <NextLink href={href ?? '#'} legacyBehavior passHref>
      <ChakraLink
        role={'group'}
        display={'block'}
        p={2}
        rounded={'md'}
        _hover={{ bg: useColorModeValue('purple.50', 'gray.900') }}
      >
      <Stack direction={'row'} align={'center'}>
        <Box>
          <Text
            transition={'all .3s ease'}
            _groupHover={{ color: 'purple.500' }}
            fontWeight={500}
          >
            {label}
          </Text>
          <Text fontSize={'sm'}>{subLabel ?? ''}</Text>
        </Box>
        <Flex
          transition={'all .3s ease'}
          transform={'translateX(-10px)'}
          opacity={0}
          _groupHover={{ opacity: '100%', transform: 'translateX(0)' }}
          justify={'flex-end'}
          align={'center'}
          flex={1}
        >
          <Icon color={'purple.500'} w={5} h={5} as={ChevronRightIcon} />
        </Flex>
      </Stack>
    </ChakraLink>
    </NextLink>
  );
};

const MobileNav = () => {
  return (
    <Stack
      bg={useColorModeValue('white', 'gray.800')}
      p={4}
      display={{ md: 'none' }}
    >
      {NAV_ITEMS.map((navItem) => (
        <MobileNavItem key={navItem.label} {...navItem} />
      ))}
    </Stack>
  );
};

const MobileNavItem = ({ label, children, href }: NavItem) => {
  const { isOpen, onToggle } = useDisclosure();
  const { t } = useTranslation('common');

  return (
    <Stack spacing={4} onClick={children && onToggle}>
      <NextLink href={href ?? '#'} legacyBehavior passHref>
        <Flex
          py={2}
          as="a"
          justify={'space-between'}
          align={'center'}
          _hover={{
            textDecoration: 'none',
          }}
        >
          <Text
            fontWeight={600}
            color={useColorModeValue('gray.600', 'gray.200')}
          >
            {label}
          </Text>
          {children && (
            <Icon
              as={ChevronDownIcon}
              transition={'all .25s ease-in-out'}
              transform={isOpen ? 'rotate(180deg)' : ''}
              w={6}
              h={6}
            />
          )}
        </Flex>
      </NextLink>

      <Collapse in={isOpen} animateOpacity style={{ marginTop: '0!important' }}>
        <Stack
          mt={2}
          pl={4}
          borderLeft={1}
          borderStyle={'solid'}
          borderColor={useColorModeValue('gray.200', 'gray.700')}
          align={'start'}
        >
          {children &&
            children.map((child) => (
              <NextLink key={child.label} href={child.href ?? '#'} legacyBehavior passHref>
                <ChakraLink py={2}>
                  {child.label}
                </ChakraLink>
              </NextLink>
            ))}
        </Stack>
      </Collapse>
    </Stack>
  );
};

interface NavItem {
  label: string;
  subLabel?: string;
  children?: Array<NavItem>;
  href?: string;
}

const NAV_ITEMS: Array<NavItem> = [
  {
    label: 'Summarize',
    href: '/',
  },
  {
    label: 'Compare',
    href: '/compare',
  },
  {
    label: 'Pricing',
    href: '/pricing',
  },
  {
    label: 'Dashboard',
    href: '/dashboard',
  },
];
