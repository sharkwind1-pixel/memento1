module.exports = function (api) {
    api.cache(true);
    return {
        presets: [
            // Reanimated 4.x는 react-native-worklets를 분리 패키지로 요구.
            // babel-preset-expo가 자동 처리. (이전엔 worklets:false로 명시했었는데,
            // Reanimated 4를 import하는 코드가 들어오면서 worklets 변환이 필수)
            "babel-preset-expo",
        ],
        plugins: [
            // Reanimated 4 권장: react-native-worklets/plugin 명시 추가 (반드시 마지막)
            "react-native-worklets/plugin",
        ],
    };
};
