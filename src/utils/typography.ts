const typography = () => ({
  DEFAULT: {
    css: {
      '--tw-prose-bullets': '#8839ef',
      'code::before': {
        content: '""',
      },
      'code::after': {
        content: '""',
      },
      code: {
        backgroundColor: '#11111b',
        padding: '0.05rem 0.5rem',
        color: '#cdd6f4',
        borderRadius: '0.375rem',
      },

      hr: {
        background: '#6027ab',
        height: '1px',
        borderTopWidth: '0',
      },
      a: {
        color: '#8839ef',
        textDecorationLine: 'none',

        '&:hover': {
          opacity: '0.75',
          textDecorationLine: 'underline',
        },
      },
      figure: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        width: '100%',

        '& img': {
          width: '100%',
          height: 'auto',
          maxWidth: '100%',
          objectFit: 'contain',
        },
      },
      figcaption: {
        fontStyle: 'italic',
        color: 'white',
        opacity: '0.75',
      },
      'p > em': {
        fontStyle: 'italic',
        color: 'white',
        opacity: '0.75',
      },
    },
  },
  invert: {
    css: {
      '--tw-prose-invert-bullets': '#8aadf4',

      hr: {
        background: '#8aadf4',
      },
      a: {
        color: '#8aadf4',

        '&:hover': {
          opacity: '0.75',
        },
      },
    },
  },
});

export default typography;
