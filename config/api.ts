interface ApiConfig {
  rest: {
    defaultLimit: number;
    maxLimit: number;
    withCount: boolean;
  };
}

const config: ApiConfig = {
  rest: {
    defaultLimit: 30,
    maxLimit: 100,
    withCount: true,
  },
};

export default config;
