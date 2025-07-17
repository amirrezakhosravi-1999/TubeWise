import {
  Box,
  Container,
  Stack,
  SimpleGrid,
  Text,
  Link,
  useColorModeValue,
  Flex,
  Icon,
} from '@chakra-ui/react';
import { FaTwitter, FaYoutube, FaInstagram, FaGithub } from 'react-icons/fa';
import { useTranslation } from 'next-i18next';
import NextLink from 'next/link';

export default function Footer() {
  const { t } = useTranslation('common');
  
  return (
    <Box
      bg={useColorModeValue('gray.50', 'gray.900')}
      color={useColorModeValue('gray.700', 'gray.200')}
      mt={10}
    >
      <Container as={Stack} maxW={'container.xl'} py={10}>
        <SimpleGrid
          templateColumns={{ sm: '1fr 1fr', md: '2fr 1fr 1fr 1fr' }}
          spacing={8}
        >
          <Stack spacing={6}>
            <Box>
              <Text fontSize="2xl" fontWeight="bold" color={useColorModeValue('purple.600', 'purple.300')}>
                TubeWise
              </Text>
            </Box>
            <Text fontSize={'sm'}>
              {new Date().getFullYear()} TubeWise. {t('footer.rights')}
            </Text>
            <Stack direction={'row'} spacing={6}>
              <Link href={'#'} isExternal>
                <Icon as={FaTwitter} w={5} h={5} />
              </Link>
              <Link href={'#'} isExternal>
                <Icon as={FaYoutube} w={5} h={5} />
              </Link>
              <Link href={'#'} isExternal>
                <Icon as={FaInstagram} w={5} h={5} />
              </Link>
              <Link href={'#'} isExternal>
                <Icon as={FaGithub} w={5} h={5} />
              </Link>
            </Stack>
          </Stack>
          <Stack align={'flex-start'}>
            <Text fontWeight={'500'} fontSize={'lg'} mb={2}>
              TubeWise
            </Text>
            <Link as={NextLink} href={'/'}>
              Summarize
            </Link>
            <Link as={NextLink} href={'/compare'}>
              Compare
            </Link>
            <Link as={NextLink} href={'/dashboard'}>
              Dashboard
            </Link>
          </Stack>
          <Stack align={'flex-start'}>
            <Text fontWeight={'500'} fontSize={'lg'} mb={2}>
              Account
            </Text>
            <Link as={NextLink} href={'/login'}>
              Log In
            </Link>
            <Link as={NextLink} href={'/signup'}>
              Sign Up
            </Link>
          </Stack>
          <Stack align={'flex-start'}>
            <Text fontWeight={'500'} fontSize={'lg'} mb={2}>
              Support
            </Text>
            <Link href={'#'}>
              Contact Us
            </Link>
            <Link href={'#'}>
              Terms of Service
            </Link>
            <Link href={'#'}>
              Privacy Policy
            </Link>
          </Stack>
        </SimpleGrid>
      </Container>
    </Box>
  );
}
