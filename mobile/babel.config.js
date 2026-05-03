module.exports = function (api) {
    api.cache(true);
    return {
        presets: [
            // Reanimated 4.x는 react-native-worklets 분리 패키지를 요구하지만
            // 모바일에서는 reanimated를 import하지 않음 (TouchParticles는 빌트인 Animated 사용).
            // worklets 플러그인을 켜면 모든 함수가 worklets로 처리되어 부팅 비용↑ + Expo Go 호환 이슈.
            ["babel-preset-expo", {
                reanimated: false,
                worklets: false,
            }],
        ],
        plugins: [],
    };
};
