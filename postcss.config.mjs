const config = {
  plugins: {
    "@tailwindcss/postcss": {},
    // Safari before 15.4 ignores everything inside @layer; flatten Tailwind's layers so those phones keep the styles.
    "@csstools/postcss-cascade-layers": {},
  },
};

export default config;
