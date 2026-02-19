/**
 * 펫매거진 목업 데이터
 * MagazinePage와 MagazineBanner에서 공유
 */

export interface MagazineArticle {
    id: number;
    category: string;
    title: string;
    summary: string;
    author: string;
    authorRole: string;
    date: string;
    readTime: string;
    views: number;
    likes: number;
    badge: string;
    image: string;
    tags: string[];
}

export const MOCK_ARTICLES: MagazineArticle[] = [
    {
        id: 1,
        category: "health",
        title: "강아지 예방접종, 언제 어떤 것을 맞춰야 할까?",
        summary:
            "강아지를 키우기 시작했다면 가장 먼저 챙겨야 할 것이 예방접종입니다. 시기별로 필요한 접종과 주의사항을 알아보세요.",
        author: "수의사 김태호",
        authorRole: "반려동물 전문 수의사",
        date: "2025.01.20",
        readTime: "5분",
        views: 2340,
        likes: 156,
        badge: "필독",
        image: "https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=400",
        tags: ["예방접종", "강아지건강", "필수정보"],
    },
    {
        id: 2,
        category: "food",
        title: "수제간식 vs 시판간식, 어떤 게 더 좋을까?",
        summary:
            "반려동물 간식 선택이 고민되시나요? 각각의 장단점과 선택 기준을 자세히 알려드립니다.",
        author: "펫영양사 이수진",
        authorRole: "반려동물 영양 컨설턴트",
        date: "2025.01.19",
        readTime: "7분",
        views: 1892,
        likes: 98,
        badge: "인기",
        image: "https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=400",
        tags: ["간식", "영양", "수제간식"],
    },
    {
        id: 3,
        category: "behavior",
        title: "분리불안, 이렇게 극복하세요",
        summary:
            "출근할 때마다 짖고 우는 강아지, 혼자 있으면 물건을 망가뜨리는 고양이. 분리불안 해결 방법을 알아봅니다.",
        author: "훈련사 박지훈",
        authorRole: "반려동물 행동교정 전문가",
        date: "2025.01.18",
        readTime: "10분",
        views: 3567,
        likes: 234,
        badge: "추천",
        image: "https://images.unsplash.com/photo-1544568100-847a948585b9?w=400",
        tags: ["분리불안", "행동교정", "훈련"],
    },
    {
        id: 4,
        category: "grooming",
        title: "집에서 하는 발톱 깎기, 이것만 알면 OK",
        summary:
            "발톱 깎기가 두려우신가요? 안전하고 스트레스 없이 집에서 발톱을 관리하는 방법을 알려드립니다.",
        author: "미용사 최예린",
        authorRole: "펫 그루밍 전문가",
        date: "2025.01.17",
        readTime: "4분",
        views: 1234,
        likes: 87,
        badge: "팁",
        image: "https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?w=400",
        tags: ["발톱관리", "그루밍", "홈케어"],
    },
    {
        id: 5,
        category: "living",
        title: "겨울철 반려동물 난방, 이렇게 해주세요",
        summary:
            "추운 겨울, 반려동물도 따뜻하게! 적정 온도와 난방 시 주의사항을 체크해보세요.",
        author: "에디터 정민아",
        authorRole: "펫매거진 에디터",
        date: "2025.01.16",
        readTime: "6분",
        views: 2089,
        likes: 143,
        badge: "시즌",
        image: "https://images.unsplash.com/photo-1415369629372-26f2fe60c467?w=400",
        tags: ["겨울", "난방", "계절케어"],
    },
    {
        id: 6,
        category: "travel",
        title: "강아지와 첫 여행, 준비물 체크리스트",
        summary:
            "반려동물과 함께하는 첫 여행! 꼭 챙겨야 할 준비물과 주의사항을 정리했습니다.",
        author: "에디터 김하늘",
        authorRole: "펫매거진 에디터",
        date: "2025.01.15",
        readTime: "8분",
        views: 1567,
        likes: 112,
        badge: "가이드",
        image: "https://images.unsplash.com/photo-1601758124510-52d02ddb7cbd?w=400",
        tags: ["여행", "준비물", "체크리스트"],
    },
    {
        id: 7,
        category: "health",
        title: "노견/노묘 케어 가이드",
        summary:
            "나이 든 반려동물을 위한 특별한 케어. 노화에 따른 변화와 관리 방법을 알아보세요.",
        author: "수의사 이정민",
        authorRole: "노령동물 전문 수의사",
        date: "2025.01.14",
        readTime: "12분",
        views: 4521,
        likes: 312,
        badge: "심화",
        image: "https://images.unsplash.com/photo-1558788353-f76d92427f16?w=400",
        tags: ["노견", "노묘", "시니어케어"],
    },
];

export const getBadgeStyle = (badge: string) => {
    switch (badge) {
        case "필독":
            return "bg-red-500 text-white";
        case "인기":
            return "bg-orange-500 text-white";
        case "추천":
            return "bg-blue-500 text-white";
        case "팁":
            return "bg-green-500 text-white";
        case "시즌":
            return "bg-purple-500 text-white";
        case "가이드":
            return "bg-sky-500 text-white";
        case "심화":
            return "bg-indigo-500 text-white";
        default:
            return "bg-gray-500 text-white";
    }
};
