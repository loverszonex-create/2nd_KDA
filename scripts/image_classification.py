#!/usr/bin/env python3
"""
EfficientNet-B0 이미지 분류 튜토리얼 스크립트

이 스크립트는 사전 훈련된 EfficientNet-B0 모델을 사용하여 
이미지 분류를 수행하는 완전한 튜토리얼을 제공합니다.

작성자: AI Assistant
날짜: 2025-10-02
"""

import os
import sys
import argparse
import logging
from pathlib import Path
from typing import List, Tuple, Optional
import warnings

# 경고 메시지 필터링
warnings.filterwarnings('ignore')

try:
    import torch
    import torch.nn as nn
    import torchvision.transforms as transforms
    from torchvision.models import efficientnet_b0, EfficientNet_B0_Weights
    from PIL import Image
    import numpy as np
    import matplotlib.pyplot as plt
    import requests
    from io import BytesIO
except ImportError as e:
    print(f"❌ 필수 라이브러리가 설치되지 않았습니다: {e}")
    print("다음 명령어로 설치하세요:")
    print("pip install torch torchvision pillow matplotlib requests numpy")
    sys.exit(1)

# 로깅 설정
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('image_classification.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)


class EfficientNetClassifier:
    """EfficientNet-B0 기반 이미지 분류기"""
    
    def __init__(self, device: Optional[str] = None):
        """
        분류기 초기화
        
        Args:
            device: 사용할 디바이스 ('cuda', 'cpu', 또는 None for auto)
        """
        self.device = self._get_device(device)
        self.model = None
        self.transform = None
        self.class_names = []

        
        logger.info(f"🔧 디바이스 설정: {self.device}")
        
    def _get_device(self, device: Optional[str]) -> str:
        """최적의 디바이스 선택"""
        if device:
            return device
        
        if torch.cuda.is_available():
            return 'cuda'
        elif hasattr(torch.backends, 'mps') and torch.backends.mps.is_available():
            return 'mps'  # Apple Silicon Mac
        else:
            return 'cpu'
    
    def load_model(self) -> None:
        """사전 훈련된 EfficientNet-B0 모델 로드"""
        logger.info("📥 EfficientNet-B0 모델 로딩 중...")
        
        try:
            # 사전 훈련된 가중치와 함께 모델 로드
            weights = EfficientNet_B0_Weights.IMAGENET1K_V1
            self.model = efficientnet_b0(weights=weights)
            self.model.eval()  # 평가 모드로 설정
            self.model.to(self.device)
            
            # ImageNet 클래스 이름 로드
            self.class_names = weights.meta["categories"]
            
            # 이미지 전처리 변환 설정
            self.transform = weights.transforms()
            
            logger.info("✅ 모델 로딩 완료!")
            logger.info(f"📊 분류 가능한 클래스 수: {len(self.class_names)}")
            
        except Exception as e:
            logger.error(f"❌ 모델 로딩 실패: {e}")
            raise
    
    def preprocess_image(self, image_path: str) -> torch.Tensor:
        """
        이미지 전처리
        
        Args:
            image_path: 이미지 파일 경로 또는 URL
            
        Returns:
            전처리된 이미지 텐서
        """
        try:
            # URL인지 로컬 파일인지 확인
            if image_path.startswith(('http://', 'https://')):
                # URL에서 이미지 다운로드
                response = requests.get(image_path)
                response.raise_for_status()
                image = Image.open(BytesIO(response.content)).convert('RGB')
                logger.info(f"🌐 URL에서 이미지 로드: {image_path}")
            else:
                # 로컬 파일에서 이미지 로드
                if not os.path.exists(image_path):
                    raise FileNotFoundError(f"이미지 파일을 찾을 수 없습니다: {image_path}")
                
                image = Image.open(image_path).convert('RGB')
                logger.info(f"📁 로컬 파일에서 이미지 로드: {image_path}")
            
            # 이미지 크기 정보 출력
            logger.info(f"📐 원본 이미지 크기: {image.size}")
            
            # 전처리 적용
            if self.transform:
                processed_image = self.transform(image)
                # 배치 차원 추가
                processed_image = processed_image.unsqueeze(0)
                return processed_image.to(self.device)
            else:
                raise RuntimeError("전처리 변환이 설정되지 않았습니다. 먼저 load_model()을 호출하세요.")
                
        except Exception as e:
            logger.error(f"❌ 이미지 전처리 실패: {e}")
            raise
    
    def predict(self, image_tensor: torch.Tensor, top_k: int = 5) -> List[Tuple[str, float]]:
        """
        이미지 분류 예측 수행
        
        Args:
            image_tensor: 전처리된 이미지 텐서
            top_k: 상위 k개 예측 결과 반환
            
        Returns:
            (클래스명, 확률) 튜플의 리스트
        """
        if self.model is None:
            raise RuntimeError("모델이 로드되지 않았습니다. 먼저 load_model()을 호출하세요.")
        
        try:
            logger.info("🔍 이미지 분류 수행 중...")
            
            with torch.no_grad():
                # 모델 예측
                outputs = self.model(image_tensor)
                
                # 소프트맥스를 적용하여 확률로 변환
                probabilities = torch.nn.functional.softmax(outputs[0], dim=0)
                
                # 상위 k개 결과 추출
                top_prob, top_indices = torch.topk(probabilities, top_k)
                
                # 결과 정리
                results = []
                for i in range(top_k):
                    class_name = self.class_names[top_indices[i].item()]
                    probability = top_prob[i].item()
                    results.append((class_name, probability))
                
                logger.info("✅ 예측 완료!")
                return results
                
        except Exception as e:
            logger.error(f"❌ 예측 실패: {e}")
            raise
    
    def classify_image(self, image_path: str, top_k: int = 5) -> List[Tuple[str, float]]:
        """
        이미지 분류 전체 파이프라인 실행
        
        Args:
            image_path: 이미지 파일 경로 또는 URL
            top_k: 상위 k개 예측 결과 반환
            
        Returns:
            (클래스명, 확률) 튜플의 리스트
        """
        # 이미지 전처리
        image_tensor = self.preprocess_image(image_path)
        
        # 예측 수행
        results = self.predict(image_tensor, top_k)
        
        return results
    
    def visualize_results(self, image_path: str, results: List[Tuple[str, float]], 
                         save_path: Optional[str] = None) -> None:
        """
        예측 결과 시각화
        
        Args:
            image_path: 원본 이미지 경로
            results: 예측 결과
            save_path: 결과 이미지 저장 경로 (선택사항)
        """
        try:
            # 원본 이미지 로드
            if image_path.startswith(('http://', 'https://')):
                response = requests.get(image_path)
                response.raise_for_status()
                image = Image.open(BytesIO(response.content)).convert('RGB')
            else:
                image = Image.open(image_path).convert('RGB')
            
            # 플롯 생성
            fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(15, 6))
            
            # 원본 이미지 표시
            ax1.imshow(image)
            ax1.set_title('입력 이미지', fontsize=14, fontweight='bold')
            ax1.axis('off')
            
            # 예측 결과 바 차트
            classes = [result[0] for result in results]
            probabilities = [result[1] for result in results]
            
            bars = ax2.barh(range(len(classes)), probabilities, color='skyblue')
            ax2.set_yticks(range(len(classes)))
            ax2.set_yticklabels(classes)
            ax2.set_xlabel('확률', fontsize=12)
            ax2.set_title('예측 결과 (상위 5개)', fontsize=14, fontweight='bold')
            ax2.set_xlim(0, 1)
            
            # 확률 값 표시
            for i, (bar, prob) in enumerate(zip(bars, probabilities)):
                ax2.text(bar.get_width() + 0.01, bar.get_y() + bar.get_height()/2, 
                        f'{prob:.3f}', va='center', fontsize=10)
            
            plt.tight_layout()
            
            # 저장 또는 표시
            if save_path:
                plt.savefig(save_path, dpi=300, bbox_inches='tight')
                logger.info(f"💾 결과 이미지 저장: {save_path}")
            else:
                plt.show()
                
        except Exception as e:
            logger.error(f"❌ 시각화 실패: {e}")
            raise


def download_sample_images() -> List[str]:
    """샘플 이미지 URL 목록 반환"""
    sample_urls = [
        "C:/KDA2/kiwoom-ai/static/images/burger.jpg",
        "C:/KDA2/kiwoom-ai/static/images/scull.jpg",
        "C:/KDA2/kiwoom-ai/static/images/magician.png"
    ]
    return sample_urls


def main():
    """메인 함수"""
    parser = argparse.ArgumentParser(description='EfficientNet-B0 이미지 분류 튜토리얼')
    parser.add_argument('--image', '-i', type=str, 
                       help='분류할 이미지 파일 경로 또는 URL')
    parser.add_argument('--top-k', '-k', type=int, default=5,
                       help='상위 k개 예측 결과 표시 (기본값: 5)')
    parser.add_argument('--device', '-d', type=str, choices=['cpu', 'cuda', 'mps'],
                       help='사용할 디바이스 (기본값: 자동 선택)')
    parser.add_argument('--save-result', '-s', type=str,
                       help='결과 이미지 저장 경로')
    parser.add_argument('--demo', action='store_true',
                       help='샘플 이미지로 데모 실행')
    
    args = parser.parse_args()
    
    try:
        # 분류기 초기화
        classifier = EfficientNetClassifier(device=args.device)
        
        # 모델 로드
        classifier.load_model()
        
        if args.demo:
            # 데모 모드: 샘플 이미지들로 테스트
            logger.info("🎯 데모 모드 실행 중...")
            sample_urls = download_sample_images()
            
            for i, url in enumerate(sample_urls, 1):
                logger.info(f"\n📸 샘플 이미지 {i}/{len(sample_urls)} 분류 중...")
                try:
                    results = classifier.classify_image(url, args.top_k)
                    
                    print(f"\n🎯 예측 결과 (샘플 {i}):")
                    print("-" * 50)
                    for j, (class_name, probability) in enumerate(results, 1):
                        print(f"{j}. {class_name}: {probability:.4f} ({probability*100:.2f}%)")
                    
                    # 시각화 (첫 번째 샘플만)
                    if i == 1:
                        classifier.visualize_results(url, results, args.save_result)
                        
                except Exception as e:
                    logger.error(f"샘플 {i} 처리 실패: {e}")
                    continue
                    
        elif args.image:
            # 단일 이미지 분류
            logger.info(f"📸 이미지 분류 시작: {args.image}")
            
            results = classifier.classify_image(args.image, args.top_k)
            
            print(f"\n🎯 예측 결과:")
            print("-" * 50)
            for i, (class_name, probability) in enumerate(results, 1):
                print(f"{i}. {class_name}: {probability:.4f} ({probability*100:.2f}%)")
            
            # 시각화
            classifier.visualize_results(args.image, results, args.save_result)
            
        else:
            # 사용법 안내
            print("🔧 사용법:")
            print("  단일 이미지 분류: python image_classification.py --image <이미지_경로>")
            print("  데모 실행: python image_classification.py --demo")
            print("  도움말: python image_classification.py --help")
            
            # 간단한 데모 실행
            print("\n🎯 간단한 데모를 실행합니다...")
            sample_url = download_sample_images()[0]
            results = classifier.classify_image(sample_url, 3)
            
            print(f"\n📸 샘플 이미지 분류 결과:")
            print("-" * 40)
            for i, (class_name, probability) in enumerate(results, 1):
                print(f"{i}. {class_name}: {probability:.4f} ({probability*100:.2f}%)")
        
        logger.info("✅ 프로그램 실행 완료!")
        
    except KeyboardInterrupt:
        logger.info("⏹️ 사용자에 의해 중단됨")
    except Exception as e:
        logger.error(f"❌ 실행 중 오류 발생: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
