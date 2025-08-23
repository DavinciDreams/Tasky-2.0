import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import { TaskyGSAPAvatar } from '../TaskyGSAPAvatar';

// Mock GSAP
vi.mock('gsap', () => ({
  gsap: {
    defaults: vi.fn(),
    timeline: vi.fn(() => ({
      to: vi.fn().mockReturnThis(),
      call: vi.fn().mockReturnThis(),
      kill: vi.fn()
    })),
    to: vi.fn(() => ({
      kill: vi.fn()
    })),
    set: vi.fn(),
    fromTo: vi.fn()
  }
}));

// Mock the tasky.png import
vi.mock('../../../assets/tasky.png', () => ({
  default: 'test-tasky-image.png'
}));

describe('TaskyGSAPAvatar', () => {
  it('renders avatar image correctly', () => {
    render(<TaskyGSAPAvatar emotion="idle" size={128} />);
    
    const avatarImage = screen.getByAltText('Tasky');
    expect(avatarImage).toBeInTheDocument();
    expect(avatarImage).toHaveAttribute('src', 'test-tasky-image.png');
  });

  it('applies correct size styling', () => {
    const { container } = render(<TaskyGSAPAvatar emotion="happy" size={96} />);
    
    const avatarContainer = container.querySelector('.tasky-avatar-container');
    expect(avatarContainer).toHaveStyle({
      width: '96px',
      height: '96px'
    });
  });

  it('handles click events', () => {
    const mockClick = vi.fn();
    render(<TaskyGSAPAvatar emotion="idle" onClick={mockClick} />);
    
    const avatarContainer = screen.getByRole('img').parentElement;
    fireEvent.click(avatarContainer!);
    
    expect(mockClick).toHaveBeenCalledTimes(1);
  });

  it('sets cursor pointer when clickable', () => {
    const { container } = render(<TaskyGSAPAvatar emotion="idle" onClick={() => {}} />);
    
    const avatarContainer = container.querySelector('.tasky-avatar-container');
    expect(avatarContainer).toHaveStyle({ cursor: 'pointer' });
  });

  it('sets cursor default when not clickable', () => {
    const { container } = render(<TaskyGSAPAvatar emotion="idle" />);
    
    const avatarContainer = container.querySelector('.tasky-avatar-container');
    expect(avatarContainer).toHaveStyle({ cursor: 'default' });
  });

  it('contains all required elements', () => {
    const { container } = render(<TaskyGSAPAvatar emotion="thinking" />);
    
    expect(container.querySelector('.tasky-avatar-container')).toBeInTheDocument();
    expect(container.querySelector('.avatar-glow')).toBeInTheDocument();
    expect(container.querySelector('.avatar-particles')).toBeInTheDocument();
    expect(screen.getByAltText('Tasky')).toBeInTheDocument();
  });

  it('exposes ref methods correctly', () => {
    const ref = React.createRef<any>();
    render(<TaskyGSAPAvatar ref={ref} emotion="idle" />);
    
    expect(ref.current).toHaveProperty('setEmotion');
    expect(ref.current).toHaveProperty('setAudioLevel');
    expect(ref.current).toHaveProperty('containerRef');
    expect(ref.current).toHaveProperty('avatarRef');
    expect(ref.current).toHaveProperty('particlesRef');
  });
});
