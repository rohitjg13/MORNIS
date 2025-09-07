import os
import cv2
import numpy as np
import matplotlib.pyplot as plt
import matplotlib.patches as patches
from matplotlib.patches import Polygon
from roboflow import Roboflow
import json
import argparse
from PIL import Image
import random

class TACOVisualization:
    def __init__(self, api_key, workspace="mohamed-traore-2ekkp", project="taco-trash-annotations-in-context", version=16):
        """
        Initialize Roboflow TACO model

        Args:
            api_key: Your Roboflow API key
            workspace: Roboflow workspace name
            project: Project name
            version: Model version
        """
        # Initialize Roboflow
        rf = Roboflow(api_key=api_key)
        self.project = rf.workspace(workspace).project(project)
        self.model = self.project.version(version).model

        # Color palette for different classes
        self.colors = [
            (255, 0, 0),    # Red
            (0, 255, 0),    # Green
            (0, 0, 255),    # Blue
            (255, 255, 0),  # Yellow
            (255, 0, 255),  # Magenta
            (0, 255, 255),  # Cyan
            (255, 165, 0),  # Orange
            (128, 0, 128),  # Purple
            (255, 192, 203), # Pink
            (0, 128, 0),    # Dark Green
            (128, 128, 0),  # Olive
            (0, 0, 128),    # Navy
            (128, 0, 0),    # Maroon
            (192, 192, 192), # Silver
            (255, 215, 0),  # Gold
        ]

        print(f"✅ Loaded TACO model: {workspace}/{project} v{version}")

    def predict_image(self, image_path, confidence=0.3, overlap=0.5, high_prob_threshold=0.7, adjacency_threshold=0.2, boost_factor=1.5):
        """
        Run inference on a single image and apply adjacency-based probability boosting

        Args:
            image_path: Path to the image
            confidence: Confidence threshold (0-1)
            overlap: Overlap threshold for NMS (0-1)
            high_prob_threshold: Threshold above which a segment is considered "high probability trash" (0-1)
            adjacency_threshold: Minimum bounding box overlap ratio to consider segments "next to" each other (0-1)
            boost_factor: Multiplier to increase probability of neighboring segments (e.g., 1.5 for 50% increase)

        Returns:
            Prediction results with modified confidences
        """
        try:
            prediction = self.model.predict(
                image_path,
                confidence=confidence,
                #overlap=overlap
            )

            # Get raw predictions
            raw_preds = prediction.json()['predictions']
            if not raw_preds:
                return prediction  # No detections, nothing to boost

            # Load image dimensions for bounding box calculations
            image = cv2.imread(image_path)
            img_height, img_width = image.shape[:2]

            # Function to calculate bounding box overlap ratio between two detections
            def bbox_overlap_ratio(pred1, pred2):
                # Extract bbox coords (normalized to pixels)
                x1_1, y1_1 = (pred1['x'] - pred1['width']/2) * img_width, (pred1['y'] - pred1['height']/2) * img_height
                x2_1, y2_1 = (pred1['x'] + pred1['width']/2) * img_width, (pred1['y'] + pred1['height']/2) * img_height
                x1_2, y1_2 = (pred2['x'] - pred2['width']/2) * img_width, (pred2['y'] - pred2['height']/2) * img_height
                x2_2, y2_2 = (pred2['x'] + pred2['width']/2) * img_width, (pred2['y'] + pred2['height']/2) * img_height

                # Intersection area
                x_left = max(x1_1, x1_2)
                y_top = max(y1_1, y1_2)
                x_right = min(x2_1, x2_2)
                y_bottom = min(y2_1, y2_2)

                if x_right < x_left or y_bottom < y_top:
                    return 0.0  # No overlap

                intersection_area = (x_right - x_left) * (y_bottom - y_top)
                area1 = (x2_1 - x1_1) * (y2_1 - y1_1)
                area2 = (x2_2 - x1_2) * (y2_2 - y1_2)

                # Symmetric overlap ratio (average of both areas)
                return intersection_area / ((area1 + area2) / 2) if (area1 + area2) > 0 else 0.0

            # Identify high-probability segments
            high_prob_indices = [i for i, pred in enumerate(raw_preds) if pred['confidence'] > high_prob_threshold]

            if not high_prob_indices:
                return prediction  # No high-prob segments to propagate from

            print(f"🔄 Found {len(high_prob_indices)} high-confidence trash segments. Applying boosts...")

            # Copy predictions to avoid mutating original
            modified_preds = [{**pred} for pred in raw_preds]  # Deep copy each dict

            # For each high-prob segment, boost neighbors (and track original)
            for high_idx in high_prob_indices:
                high_pred = raw_preds[high_idx]
                for neighbor_idx in range(len(raw_preds)):
                    if neighbor_idx == high_idx:
                        continue  # Skip self
                    neighbor_pred = raw_preds[neighbor_idx]

                    overlap_ratio = bbox_overlap_ratio(high_pred, neighbor_pred)
                    if overlap_ratio > adjacency_threshold:
                        original_conf = neighbor_pred['confidence']
                        new_conf = min(1.0, original_conf * boost_factor)
                        if new_conf > original_conf:  # Only boost if it increases
                            modified_preds[neighbor_idx]['original_confidence'] = original_conf
                            modified_preds[neighbor_idx]['confidence'] = new_conf
                            print(f"   📈 Boosted neighbor {neighbor_idx} (class: {neighbor_pred.get('class', 'Unknown')}) from {original_conf:.2f} to {new_conf:.2f} (overlap: {overlap_ratio:.2f})")

            # Update the prediction JSON with modified predictions
            prediction.json()['predictions'] = modified_preds
            return prediction

        except Exception as e:
            print(f"❌ Error predicting {image_path}: {e}")
            return None

    def visualize_prediction(self, image_path, prediction, save_path=None, show_masks=True, show_boxes=True):
        """
        Visualize prediction results on the image

        Args:
            image_path: Path to original image
            prediction: Roboflow prediction object
            save_path: Path to save visualization (optional)
            show_masks: Whether to show segmentation masks
            show_boxes: Whether to show bounding boxes
        """
        # Load image
        image = cv2.imread(image_path)
        if image is None:
            print(f"❌ Could not load image: {image_path}")
            return None

        image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)

        # Create figure
        fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(20, 10))

        # Original image
        ax1.imshow(image)
        ax1.set_title("Original Image", fontsize=16, fontweight='bold')
        ax1.axis('off')

        # Prediction visualization
        ax2.imshow(image)
        ax2.set_title(f"TACO Waste Detection ({len(prediction.json()['predictions'])} detections)",
                     fontsize=16, fontweight='bold')
        ax2.axis('off')

        # Process predictions
        predictions = prediction.json()['predictions']

        if not predictions:
            ax2.text(image.shape[1]//2, image.shape[0]//2, 'No waste detected',
                    ha='center', va='center', fontsize=20,
                    bbox=dict(boxstyle="round,pad=0.3", facecolor="yellow", alpha=0.7))
        else:
            # Draw predictions
            for i, pred in enumerate(predictions):
                # Safely get class and confidence (with defaults to avoid KeyErrors)
                class_name = pred.get('class', 'Unknown')
                confidence = pred.get('confidence', 0.0)

                # Get color for this class
                color = np.array(self.colors[i % len(self.colors)]) / 255.0

                # Optional: Check if boosted
                original_conf = pred.get('original_confidence', confidence)
                is_boosted = abs(confidence - original_conf) > 1e-6 and confidence > original_conf

                # Draw bounding box if requested
                if show_boxes and 'x' in pred:
                    x_center = pred['x']
                    y_center = pred['y']
                    width = pred['width']
                    height = pred['height']

                    # Convert to corner coordinates
                    x1 = x_center - width / 2
                    y1 = y_center - height / 2

                    # Create rectangle
                    rect = patches.Rectangle((x1, y1), width, height,
                                           linewidth=3, edgecolor=color,
                                           facecolor='none', alpha=0.8)
                    ax2.add_patch(rect)

                    # Add label with optional boosted indicator
                    label_text = f'{class_name} ({confidence:.2f})'
                    if is_boosted:
                        label_text += ' [BOOSTED]'
                    ax2.text(x1, y1-10, label_text,
                            fontsize=12, fontweight='bold', color='white',
                            bbox=dict(boxstyle="round,pad=0.3", facecolor=color, alpha=0.8))

                # Draw segmentation mask if available and requested
                if show_masks and 'points' in pred:
                    points = pred['points']
                    if points:
                        # Convert points to polygon
                        polygon_points = [(p['x'], p['y']) for p in points]
                        if len(polygon_points) >= 3:  # Need at least 3 points for polygon
                            polygon = Polygon(polygon_points, closed=True,
                                            facecolor=color, alpha=0.3,
                                            edgecolor=color, linewidth=2)
                            ax2.add_patch(polygon)

            # Add legend (uses predictions directly, safe even if empty)
            if predictions:
                legend_elements = []
                unique_classes = list(set([p.get('class', 'Unknown') for p in predictions]))
                for i, class_name in enumerate(unique_classes):
                    color = np.array(self.colors[i % len(self.colors)]) / 255.0
                    legend_elements.append(patches.Patch(color=color, label=class_name))

                ax2.legend(handles=legend_elements, loc='upper right',
                          bbox_to_anchor=(1, 1), fontsize=10)

        plt.tight_layout()

        # Save if requested
        if save_path:
            plt.savefig(save_path, dpi=300, bbox_inches='tight')
            print(f"💾 Saved visualization: {save_path}")

        plt.show()
        return fig

    def batch_predict_and_visualize(self, image_dir, output_dir, num_samples=10,
                                   confidence=0.3, overlap=0.5):
        """
        Run predictions on multiple images and save visualizations

        Args:
            image_dir: Directory containing images
            output_dir: Directory to save results
            num_samples: Number of images to process
            confidence: Confidence threshold
            overlap: Overlap threshold
        """
        # Create output directory
        os.makedirs(output_dir, exist_ok=True)

        # Get image files
        image_extensions = ['.jpg', '.jpeg', '.png', '.bmp']
        image_files = []

        # Search through subdirectories (for batch folders)
        for root, dirs, files in os.walk(image_dir):
            for file in files:
                if any(file.lower().endswith(ext) for ext in image_extensions):
                    image_files.append(os.path.join(root, file))

        if not image_files:
            print(f"❌ No images found in {image_dir}")
            return

        # Randomly sample images
        sample_images = random.sample(image_files, min(num_samples, len(image_files)))

        print(f"🔍 Processing {len(sample_images)} images from {len(image_files)} total images...")

        results_summary = []

        for i, image_path in enumerate(sample_images):
            print(f"\n📸 Processing {i+1}/{len(sample_images)}: {os.path.basename(image_path)}")

            # Run prediction
            prediction = self.predict_image(image_path, confidence, overlap)

            if prediction is None:
                continue

            # Get prediction count
            pred_count = len(prediction.json()['predictions'])
            print(f"   🎯 Found {pred_count} waste objects")

            # Create visualization
            base_name = os.path.splitext(os.path.basename(image_path))[0]
            save_path = os.path.join(output_dir, f"{base_name}_detection.jpg")

            try:
                self.visualize_prediction(image_path, prediction, save_path,
                                        show_masks=True, show_boxes=True)

                # Store results
                results_summary.append({
                    'image': os.path.basename(image_path),
                    'detections': pred_count,
                    'classes': [pred['class'] for pred in prediction.json()['predictions']],
                    'confidences': [pred['confidence'] for pred in prediction.json()['predictions']]
                })

            except Exception as e:
                print(f"   ❌ Error visualizing {image_path}: {e}")

        # Save summary
        summary_path = os.path.join(output_dir, 'detection_summary.json')
        with open(summary_path, 'w') as f:
            json.dump(results_summary, f, indent=2)

        print(f"\n✅ Completed! Results saved in: {output_dir}")
        print(f"📊 Summary saved: {summary_path}")

        # Print statistics
        total_detections = sum([len(r['classes']) for r in results_summary])
        all_classes = []
        for r in results_summary:
            all_classes.extend(r['classes'])

        unique_classes = list(set(all_classes))

        print(f"\n📈 Detection Statistics:")
        print(f"   Total detections: {total_detections}")
        print(f"   Unique waste classes: {len(unique_classes)}")
        print(f"   Classes found: {', '.join(unique_classes)}")

        return results_summary



def annotate_image(
    image_path,
    taco_visualization,
    confidence=0.3,
    overlap=0.5,
    high_prob_threshold=0.7,
    adjacency_threshold=0.2,
    boost_factor=1.5,
    show_masks=True,
    show_boxes=True
):
    """
    Runs prediction and returns the annotated image as a NumPy array (RGB).

    Args:
        image_path: Path to the input image.
        taco_visualization: An instance of TACOVisualization (already initialized).
        confidence: Confidence threshold for predictions.
        overlap: Overlap threshold for NMS.
        high_prob_threshold: Threshold for high-probability segments.
        adjacency_threshold: Overlap ratio for adjacency boosting.
        boost_factor: Probability boost factor for neighbors.
        show_masks: Whether to show segmentation masks.
        show_boxes: Whether to show bounding boxes.

    Returns:
        Annotated image as a NumPy array (RGB).
    """
    prediction = taco_visualization.predict_image(
        image_path,
        confidence=confidence,
        overlap=overlap,
        high_prob_threshold=high_prob_threshold,
        adjacency_threshold=adjacency_threshold,
        boost_factor=boost_factor
    )
    if prediction is None:
        raise RuntimeError("Prediction failed or no detections.")

    import matplotlib.pyplot as plt
    fig = taco_visualization.visualize_prediction(
        image_path, prediction, save_path=None, show_masks=show_masks, show_boxes=show_boxes
    )
    fig.canvas.draw()
    annotated_img = np.frombuffer(fig.canvas.tostring_rgb(), dtype=np.uint8)
    annotated_img = annotated_img.reshape(fig.canvas.get_width_height()[::-1] + (3,))
    plt.close(fig)
    return annotated_img





def main():
    parser = argparse.ArgumentParser(description='TACO Waste Detection with Roboflow')
    parser.add_argument('--api_key', type=str, required=True,
                       help='Your Roboflow API key')
    parser.add_argument('--image_dir', type=str, default='data/',
                       help='Directory containing images')
    parser.add_argument('--output_dir', type=str, default='./roboflow_results',
                       help='Directory to save results')
    parser.add_argument('--num_samples', type=int, default=10,
                       help='Number of sample images to process')
    parser.add_argument('--confidence', type=float, default=0.3,
                       help='Confidence threshold (0-1)')
    parser.add_argument('--overlap', type=float, default=0.5,
                       help='Overlap threshold for NMS (0-1)')
    parser.add_argument('--single_image', type=str, default=None,
                       help='Process a single image instead of batch')
    parser.add_argument('--workspace', type=str, default='mohamed-traore-2ekkp',
                       help='Roboflow workspace')
    parser.add_argument('--project', type=str, default='taco-trash-annotations-in-context',
                       help='Roboflow project name')

    args = parser.parse_args()

    # Initialize visualizer
    print("🚀 Initializing TACO Waste Detection...")
    visualizer = TACOVisualization(
        api_key=args.api_key,
        workspace=args.workspace,
        project=args.project
    )

    if args.single_image:
        # Process single image
        print(f"\n🖼️  Processing single image: {args.single_image}")
        prediction = visualizer.predict_image(args.single_image, args.confidence, args.overlap)

        if prediction:
            visualizer.visualize_prediction(args.single_image, prediction,
                                          save_path=os.path.join(args.output_dir, 'single_image_result.jpg'))
        else:
            print("❌ Failed to process image")
    else:
        # Process batch of images
        visualizer.batch_predict_and_visualize(
            image_dir=args.image_dir,
            output_dir=args.output_dir,
            num_samples=args.num_samples,
            confidence=args.confidence,
            overlap=args.overlap
        )

if __name__ == "__main__":
    # Hardcoded settings for easy testing
    print("🌮 TACO Waste Detection with Roboflow API")
    print("=" * 50)

    # Hardcoded API key and image path
    API_KEY = "UGKpDQUUduWH3tlrf0CU"
    IMAGE_PATH = "/home/ojas/Downloads/ssh_garbage/landfill.jpg"

    print(f"🖼️  Processing image: {IMAGE_PATH}")

    try:
        # Initialize TACO visualizer
        visualizer = TACOVisualization(api_key=API_KEY)

        # Check if image exists
        if not os.path.exists(IMAGE_PATH):
            print(f"❌ Image not found: {IMAGE_PATH}")
            print("   Please make sure the image exists at this path")
#            return

        print(f"\n🔍 Running waste detection on: {os.path.basename(IMAGE_PATH)}")

        # Run prediction on the hardcoded image
        # Run prediction with boosting
        prediction = visualizer.predict_image(IMAGE_PATH, confidence=0.05, overlap=0.5,
                                              high_prob_threshold=0.5,  # Adjust as needed
                                              adjacency_threshold=0.2,   # 20% overlap to be "next to"
                                              boost_factor=5.0)          # 50% increase

        if prediction:
            pred_count = len(prediction.json()['predictions'])
            print(f"🎯 Found {pred_count} waste objects!")

            # Create output directory
            output_dir = './roboflow_results'
            os.makedirs(output_dir, exist_ok=True)

            # Visualize the results
            save_path = os.path.join(output_dir, 'landfill_detection_result.jpg')
            visualizer.visualize_prediction(IMAGE_PATH, prediction, save_path,
                                          show_masks=True, show_boxes=True)

            # Print detection details
            print("\n📊 Detection Details:")
            for i, pred in enumerate(prediction.json()['predictions']):
                class_name = pred['class']
                confidence = pred['confidence']
                print(f"   {i+1}. {class_name} (confidence: {confidence:.2f})")

            print(f"\n✅ Results saved to: {save_path}")

        else:
            print("❌ Failed to run prediction")

    except Exception as e:
        print(f"❌ Error: {e}")
        print("\n💡 Troubleshooting:")
        print("   1. Check if the image file exists")
        print("   2. Verify your internet connection")
        print("   3. Make sure the API key is valid")
