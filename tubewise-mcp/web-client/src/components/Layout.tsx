import { ReactNode } from 'react';
import { Box } from '@chakra-ui/react';
import Header from './Header';
import Footer from './Footer';

type LayoutProps = {
  children: ReactNode;
};

export default function Layout({ children }: LayoutProps) {
  return (
    <Box minH="100vh" display="flex" flexDirection="column">
      <Header />
      <Box flex="1">{children}</Box>
      <Footer />
    </Box>
  );
}
