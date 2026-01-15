/**
 * 입양정보 페이지 - 새로운 가족을 찾아주는 따뜻한 공간
 * "반려동물과의 시간을 기록해도 괜찮은 장소"의 시작점
 * 파란하늘 테마 + 감성적 디자인
 */

"use client";

import { useState, useEffect } from "react";
import {
    Card,
    CardContent,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Heart,
    MapPin,
    Calendar,
    Users,
    Search,
    Filter,
    Phone,
    MessageCircle,
    Star,
    PawPrint,
    Baby,
    Dog,
    Cat,
    Rabbit,
} from "lucide-react";
import { EmotionalTrueFocus } from "../ui/TrueFocus";
import { usePetImages } from "@/hooks/usePetImages";

// 입양 동물 정보 타입
interface AdoptionPet {
    id: string;
    name: string;
    species: "dog" | "cat" | "rabbit" | "bird";
    breed: string;
    age: string;
    gender: "male" | "female";
    size: "small" | "medium" | "large";
    personality: string[];
    description: string;
    location: string;
    shelter: string;
    contact: string;
    imageUrl: string;
    isUrgent?: boolean;
    healthStatus: string;
    adoptionFee: number;
    postedDate: string;
    isFavorited?: boolean;
}

// 임시 데모 데이터
const mockAdoptionPets: AdoptionPet[] = [
    {
        id: "1",
        name: "몽이",
        species: "dog",
        breed: "골든리트리버 믹스",
        age: "2살",
        gender: "male",
        size: "large",
        personality: ["온순함", "사람 좋아함", "활발함"],
        description:
            "사람을 정말 좋아하는 착한 몽이예요. 산책을 좋아하고 아이들과도 잘 어울려요.",
        location: "서울 강남구",
        shelter: "사랑 보호소",
        contact: "02-1234-5678",
        imageUrl: "/api/placeholder/300/300",
        healthStatus: "건강함",
        adoptionFee: 100000,
        postedDate: "2024-01-10",
        isFavorited: false,
    },
    {
        id: "2",
        name: "루나",
        species: "cat",
        breed: "코리안 숏헤어",
        age: "1살",
        gender: "female",
        size: "small",
        personality: ["조용함", "독립적", "애교 많음"],
        description:
            "조용하고 차분한 성격의 루나예요. 혼자 있는 시간도 잘 보내고 애교도 부려요.",
        location: "서울 마포구",
        shelter: "희망 동물보호센터",
        contact: "02-2345-6789",
        imageUrl: "/api/placeholder/300/300",
        healthStatus: "건강함",
        adoptionFee: 80000,
        postedDate: "2024-01-12",
        isUrgent: true,
        isFavorited: true,
    },
    {
        id: "3",
        name: "초코",
        species: "dog",
        breed: "포메라니안",
        age: "3살",
        gender: "female",
        size: "small",
        personality: ["활발함", "장난기 많음", "영리함"],
        description:
            "작지만 당찬 초코예요! 똑똑하고 장난기 많아서 함께 있으면 즐거워요.",
        location: "경기 성남시",
        shelter: "새생명 보호소",
        contact: "031-3456-7890",
        imageUrl: "/api/placeholder/300/300",
        healthStatus: "건강함",
        adoptionFee: 120000,
        postedDate: "2024-01-08",
    },
];

export default function AdoptionPage() {
    const { petImages } = usePetImages();

    const [pets, setPets] = useState<AdoptionPet[]>(mockAdoptionPets);
    const [filteredPets, setFilteredPets] =
        useState<AdoptionPet[]>(mockAdoptionPets);
    const [searchTerm, setSearchTerm] = useState("");
    const [speciesFilter, setSpeciesFilter] = useState<string>("all");
    const [sizeFilter, setSizeFilter] = useState<string>("all");
    const [locationFilter, setLocationFilter] = useState<string>("all");
    const [showFilters, setShowFilters] = useState(false);

    // 필터링 로직
    useEffect(() => {
        let filtered = pets.filter((pet) => {
            const matchesSearch =
                pet.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                pet.breed.toLowerCase().includes(searchTerm.toLowerCase()) ||
                pet.description
                    .toLowerCase()
                    .includes(searchTerm.toLowerCase());

            const matchesSpecies =
                speciesFilter === "all" || pet.species === speciesFilter;
            const matchesSize = sizeFilter === "all" || pet.size === sizeFilter;
            const matchesLocation =
                locationFilter === "all" ||
                pet.location.includes(locationFilter);

            return (
                matchesSearch &&
                matchesSpecies &&
                matchesSize &&
                matchesLocation
            );
        });

        filtered = filtered.sort((a, b) => {
            if (a.isUrgent && !b.isUrgent) return -1;
            if (!a.isUrgent && b.isUrgent) return 1;
            return 0;
        });

        setFilteredPets(filtered);
    }, [pets, searchTerm, speciesFilter, sizeFilter, locationFilter]);

    const toggleFavorite = (petId: string) => {
        setPets((prev) =>
            prev.map((pet) =>
                pet.id === petId
                    ? { ...pet, isFavorited: !pet.isFavorited }
                    : pet
            )
        );
    };

    const getSpeciesIcon = (species: string) => {
        switch (species) {
            case "dog":
                return <Dog className="w-5 h-5" />;
            case "cat":
                return <Cat className="w-5 h-5" />;
            case "rabbit":
                return <Rabbit className="w-5 h-5" />;
            default:
                return <PawPrint className="w-5 h-5" />;
        }
    };

    const getSpeciesKorean = (species: string) => {
        switch (species) {
            case "dog":
                return "강아지";
            case "cat":
                return "고양이";
            case "rabbit":
                return "토끼";
            case "bird":
                return "조류";
            default:
                return "기타";
        }
    };

    return (
        <div className="min-h-screen relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-sky-100 via-blue-50 to-white dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
                <div className="absolute top-0 right-1/4 w-80 h-80 bg-gradient-to-r from-blue-200/20 to-sky-200/20 rounded-full blur-3xl animate-pulse"></div>
                <div className="absolute bottom-1/3 left-1/4 w-72 h-72 bg-gradient-to-r from-sky-200/20 to-blue-100/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
            </div>

            <div className="relative z-10 max-w-7xl mx-auto px-4 py-8">
                <div className="text-center mb-8">
                    <h1 className="text-4xl md:text-5xl font-bold mb-4">
                        <EmotionalTrueFocus
                            text="새로운 가족을 기다리는 친구들"
                            variant="gentle"
                            className="bg-gradient-to-r from-blue-600 to-sky-600 dark:from-blue-400 dark:to-sky-400 bg-clip-text text-transparent"
                            delay={200}
                        />
                    </h1>

                    <div className="mt-4">
                        <EmotionalTrueFocus
                            text="여기서 시작되는 특별한 인연, 함께할 시간을 기록해나가세요"
                            variant="warm"
                            className="text-lg md:text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto"
                            delay={1000}
                        />
                    </div>
                </div>

                <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-lg border border-white/50 dark:border-gray-700/50 rounded-3xl p-6 mb-8 shadow-xl">
                    <div className="flex flex-col lg:flex-row gap-4 items-center">
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <Input
                                placeholder="이름, 품종, 특징으로 검색해보세요..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10 bg-white/70 dark:bg-gray-700/70 border-blue-200 dark:border-blue-600"
                            />
                        </div>

                        <Button
                            variant="outline"
                            onClick={() => setShowFilters(!showFilters)}
                            className="bg-white/70 dark:bg-gray-700/70 border-blue-200 dark:border-blue-600"
                        >
                            <Filter className="w-4 h-4 mr-2" />
                            필터
                        </Button>
                    </div>

                    {showFilters && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 pt-4 border-t border-blue-100 dark:border-blue-800">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    종류
                                </label>
                                <Select
                                    value={speciesFilter}
                                    onValueChange={setSpeciesFilter}
                                >
                                    <SelectTrigger className="bg-white/70 dark:bg-gray-700/70">
                                        <SelectValue placeholder="전체" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">
                                            전체
                                        </SelectItem>
                                        <SelectItem value="dog">
                                            강아지
                                        </SelectItem>
                                        <SelectItem value="cat">
                                            고양이
                                        </SelectItem>
                                        <SelectItem value="rabbit">
                                            토끼
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    크기
                                </label>
                                <Select
                                    value={sizeFilter}
                                    onValueChange={setSizeFilter}
                                >
                                    <SelectTrigger className="bg-white/70 dark:bg-gray-700/70">
                                        <SelectValue placeholder="전체" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">
                                            전체
                                        </SelectItem>
                                        <SelectItem value="small">
                                            소형
                                        </SelectItem>
                                        <SelectItem value="medium">
                                            중형
                                        </SelectItem>
                                        <SelectItem value="large">
                                            대형
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    지역
                                </label>
                                <Select
                                    value={locationFilter}
                                    onValueChange={setLocationFilter}
                                >
                                    <SelectTrigger className="bg-white/70 dark:bg-gray-700/70">
                                        <SelectValue placeholder="전체" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">
                                            전체
                                        </SelectItem>
                                        <SelectItem value="서울">
                                            서울
                                        </SelectItem>
                                        <SelectItem value="경기">
                                            경기도
                                        </SelectItem>
                                        <SelectItem value="인천">
                                            인천
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
                        입양 대기 중인 친구들 ({filteredPets.length}마리)
                    </h2>

                    {filteredPets.filter((pet) => pet.isUrgent).length > 0 && (
                        <Badge className="bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 border-red-200 dark:border-red-700">
                            긴급{" "}
                            {filteredPets.filter((pet) => pet.isUrgent).length}
                            마리
                        </Badge>
                    )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredPets.map((pet, index) => (
                        <Card
                            key={pet.id}
                            className={`
                bg-white/60 dark:bg-gray-800/60 backdrop-blur-lg border-white/50 dark:border-gray-700/50 shadow-xl hover:shadow-2xl transition-all duration-200 transform hover:scale-105 relative
                ${pet.isUrgent ? "ring-2 ring-red-300 dark:ring-red-600" : ""}
              `}
                        >
                            {pet.isUrgent && (
                                <div className="absolute -top-2 -right-2 z-10">
                                    <Badge className="bg-red-500 text-white border-red-600 animate-pulse">
                                        긴급
                                    </Badge>
                                </div>
                            )}

                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => toggleFavorite(pet.id)}
                                className="absolute top-3 right-3 z-10 bg-white/80 dark:bg-gray-700/80 rounded-full p-2 hover:bg-white dark:hover:bg-gray-600"
                            >
                                <Heart
                                    className={`w-5 h-5 ${
                                        pet.isFavorited
                                            ? "fill-red-500 text-red-500"
                                            : "text-gray-400"
                                    }`}
                                />
                            </Button>

                            <CardHeader className="pb-4">
                                <div className="w-full h-48 bg-gradient-to-br from-blue-100 to-sky-100 dark:from-blue-900/30 dark:to-sky-900/30 rounded-2xl overflow-hidden mb-4">
                                    {petImages && petImages.length > 0 ? (
                                        <img
                                            src={
                                                petImages[
                                                    index % petImages.length
                                                ]
                                            }
                                            alt={`${pet.name} 사진`}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center">
                                            <div className="text-4xl text-blue-400">
                                                {getSpeciesIcon(pet.species)}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="flex items-center justify-between">
                                    <CardTitle className="text-xl font-bold text-gray-800 dark:text-gray-100">
                                        {pet.name}
                                    </CardTitle>
                                    <div className="flex items-center space-x-1 text-blue-600 dark:text-blue-400">
                                        {getSpeciesIcon(pet.species)}
                                        <span className="text-sm">
                                            {getSpeciesKorean(pet.species)}
                                        </span>
                                    </div>
                                </div>

                                <div className="flex flex-wrap gap-2 mt-2">
                                    <Badge
                                        variant="outline"
                                        className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700 text-blue-700 dark:text-blue-300"
                                    >
                                        {pet.breed}
                                    </Badge>
                                    <Badge
                                        variant="outline"
                                        className="bg-sky-50 dark:bg-sky-900/20 border-sky-200 dark:border-sky-700 text-sky-700 dark:text-sky-300"
                                    >
                                        {pet.age}
                                    </Badge>
                                    <Badge
                                        variant="outline"
                                        className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700 text-green-700 dark:text-green-300"
                                    >
                                        {pet.gender === "male"
                                            ? "수컷"
                                            : "암컷"}
                                    </Badge>
                                </div>
                            </CardHeader>

                            <CardContent className="space-y-4">
                                <div>
                                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        성격
                                    </h4>
                                    <div className="flex flex-wrap gap-1">
                                        {pet.personality.map((trait, i) => (
                                            <span
                                                key={i}
                                                className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 text-xs rounded-full"
                                            >
                                                {trait}
                                            </span>
                                        ))}
                                    </div>
                                </div>

                                <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                                    {pet.description}
                                </p>

                                <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                                    <MapPin className="w-4 h-4 mr-1" />
                                    {pet.location} • {pet.shelter}
                                </div>

                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-gray-600 dark:text-gray-300">
                                        입양비
                                    </span>
                                    <span className="font-bold text-blue-600 dark:text-blue-400">
                                        {pet.adoptionFee.toLocaleString()}원
                                    </span>
                                </div>
                            </CardContent>

                            <CardFooter className="flex gap-2">
                                <Button
                                    className="flex-1 bg-gradient-to-r from-blue-500 to-sky-500 hover:from-blue-600 hover:to-sky-600 text-white"
                                    size="sm"
                                >
                                    <Phone className="w-4 h-4 mr-2" />
                                    연락하기
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="bg-white/70 dark:bg-gray-700/70 border-blue-200 dark:border-blue-600"
                                >
                                    <MessageCircle className="w-4 h-4 mr-2" />
                                    상세보기
                                </Button>
                            </CardFooter>
                        </Card>
                    ))}
                </div>

                {filteredPets.length === 0 && (
                    <div className="text-center py-16">
                        <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Search className="w-8 h-8 text-gray-400" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-600 dark:text-gray-300 mb-2">
                            조건에 맞는 친구들을 찾지 못했어요
                        </h3>
                        <p className="text-gray-500 dark:text-gray-400">
                            다른 조건으로 다시 검색해보세요
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
