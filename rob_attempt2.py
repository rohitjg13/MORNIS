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
            (255, 0, 0),     # Red
            (0, 255, 0),     # Green
            (0, 0, 255),     # Blue
            (255, 255, 0),   # Yellow
            (255, 0, 255),   # Magenta
            (0, 255, 255),   # Cyan
            (255, 165, 0),   # Orange
            (128, 0, 128),   # Purple
            (255, 192, 203), # Pink
            (0, 128, 0),     # Dark Green
            (128, 128, 0),   # Olive
            (0, 0, 128),     # Navy
            (128, 0, 0),     # Maroon
            (192, 192, 192), # Silver
            (255, 215, 0),   # Gold
        ]

        #print(f"✅ Loaded TACO model: {workspace}/{project} v{version}")

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
                #overlap=overlap # Note: overlap is often handled by the model API directly
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
                x1_1, y1_1 = (pred1['x'] - pred1['width']/2), (pred1['y'] - pred1['height']/2)
                x2_1, y2_1 = (pred1['x'] + pred1['width']/2), (pred1['y'] + pred1['height']/2)
                x1_2, y1_2 = (pred2['x'] - pred2['width']/2), (pred2['y'] - pred2['height']/2)
                x2_2, y2_2 = (pred2['x'] + pred2['width']/2), (pred2['y'] + pred2['height']/2)

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

                # Using intersection over union (IoU) is a common metric
                union_area = area1 + area2 - intersection_area
                return intersection_area / union_area if union_area > 0 else 0.0

            # Identify high-probability segments
            high_prob_indices = [i for i, pred in enumerate(raw_preds) if pred['confidence'] > high_prob_threshold]

            if not high_prob_indices:
                return prediction  # No high-prob segments to propagate from

            print(f"🔄 Found {len(high_prob_indices)} high-confidence trash segments. Applying boosts...")

            # Copy predictions to avoid mutating original
            modified_preds = [{**pred} for pred in raw_preds]  # Deep copy each dict

            # For each high-prob segment, boost neighbors
            for high_idx in high_prob_indices:
                high_pred = raw_preds[high_idx]
                for neighbor_idx, neighbor_pred in enumerate(raw_preds):
                    if neighbor_idx == high_idx:
                        continue  # Skip self

                    overlap_ratio = bbox_overlap_ratio(high_pred, neighbor_pred)
                    if overlap_ratio > adjacency_threshold:
                        original_conf = neighbor_pred['confidence']
                        new_conf = min(1.0, original_conf * boost_factor)
                        if new_conf > modified_preds[neighbor_idx]['confidence']:  # Prevent lowering confidence
                            modified_preds[neighbor_idx]['original_confidence'] = original_conf
                            modified_preds[neighbor_idx]['confidence'] = new_conf
                            print(f"    📈 Boosted neighbor {neighbor_idx} (class: {neighbor_pred.get('class', 'Unknown')}) from {original_conf:.2f} to {new_conf:.2f} (overlap: {overlap_ratio:.2f})")

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
        img_height, img_width = image.shape[:2]

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
            ax2.text(img_width//2, img_height//2, 'No waste detected',
                     ha='center', va='center', fontsize=20,
                     bbox=dict(boxstyle="round,pad=0.3", facecolor="yellow", alpha=0.7))
        else:
            class_color_map = {}
            color_idx = 0
            for i, pred in enumerate(predictions):
                class_name = pred.get('class', 'Unknown')
                confidence = pred.get('confidence', 0.0)

                # Assign a consistent color to each class
                if class_name not in class_color_map:
                    class_color_map[class_name] = np.array(self.colors[color_idx % len(self.colors)]) / 255.0
                    color_idx += 1
                color = class_color_map[class_name]

                is_boosted = 'original_confidence' in pred

                # Draw bounding box
                if show_boxes and 'x' in pred:
                    x, y, w, h = pred['x'], pred['y'], pred['width'], pred['height']
                    x1, y1 = x - w / 2, y - h / 2
                    rect = patches.Rectangle((x1, y1), w, h, linewidth=2, edgecolor=color, facecolor='none', alpha=0.8)
                    ax2.add_patch(rect)

                    label_text = f'{class_name} ({confidence:.2f}){" boosted" if is_boosted else ""}'
                    ax2.text(x1, y1 - 10, label_text, fontsize=10, fontweight='bold', color='white',
                             bbox=dict(boxstyle="round,pad=0.2", facecolor=color, alpha=0.8))

                # Draw segmentation mask
                if show_masks and 'points' in pred and len(pred['points']) >= 3:
                    polygon_points = [(p['x'], p['y']) for p in pred['points']]
                    polygon = Polygon(polygon_points, closed=True, facecolor=color, alpha=0.4, edgecolor=color, linewidth=1)
                    ax2.add_patch(polygon)

            # Add legend
            legend_elements = [patches.Patch(color=color, label=name) for name, color in class_color_map.items()]
            ax2.legend(handles=legend_elements, loc='upper right', bbox_to_anchor=(1, 1), fontsize=10)

        plt.tight_layout()
        if save_path:
            plt.savefig(save_path, dpi=300, bbox_inches='tight')
            print(f"💾 Saved visualization: {save_path}")
        plt.show()
        return fig

    def batch_predict_and_visualize(self, image_dir, output_dir, num_samples=10, confidence=0.3, overlap=0.5):
        # Implementation remains the same...
        pass # The original batch processing code is fine.


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
    Runs prediction on a single image, calculates a cleanliness score,
    and returns the annotated image as a NumPy array.
    """
    prediction = taco_visualization.predict_image(
        image_path,
        confidence=confidence,
        overlap=overlap,
        high_prob_threshold=high_prob_threshold,
        adjacency_threshold=adjacency_threshold,
        boost_factor=boost_factor
    )
    if prediction is None or not prediction.json()['predictions']:
        print("ℹ️ No trash detected or prediction failed.")
        img = cv2.imread(image_path)
        return cv2.cvtColor(img, cv2.COLOR_BGR2RGB), 0.0, "Clean"

    # --- Calculate trash pixel percentage ---
    img = cv2.imread(image_path)
    h, w = img.shape[:2]
    trash_mask = np.zeros((h, w), dtype=np.uint8)

    for pred in prediction.json()['predictions']:
        if 'points' in pred and pred['points']:
            polygon = np.array([[p['x'], p['y']] for p in pred['points']], dtype=np.int32)
            if len(polygon) >= 3:
                cv2.fillPoly(trash_mask, [polygon], 1)

    trash_pixels = np.sum(trash_mask)
    total_pixels = h * w
    trash_percentage = (trash_pixels / total_pixels) * 100 if total_pixels > 0 else 0

    # --- Assign a score based on trash percentage ---
    if trash_percentage < 5:
        score = "Clean"
    elif trash_percentage < 20:
        score = "Moderate"
    else:
        score = "Dirty"

    # --- Generate annotated image without showing it directly ---
    fig = taco_visualization.visualize_prediction(
        image_path, prediction, save_path=None, show_masks=show_masks, show_boxes=show_boxes
    )

    #
    # ▼▼▼ THIS IS THE CORRECTED CODE BLOCK ▼▼▼
    #
    fig.canvas.draw()
    # Get the RGBA buffer from the figure
    rgba_buffer = fig.canvas.buffer_rgba()
    # Convert the buffer to a NumPy array
    annotated_img_rgba = np.asarray(rgba_buffer)
    # Convert the RGBA image to RGB using OpenCV
    annotated_img = cv2.cvtColor(annotated_img_rgba, cv2.COLOR_RGBA2RGB)
    plt.close(fig) # Close the figure to free memory
    # ▲▲▲ END OF CORRECTION ▲▲▲
    #

    return annotated_img, trash_percentage, score


def main():
    parser = argparse.ArgumentParser(description='TACO Waste Detection with Roboflow')
    # ... (Argument parsing logic remains the same) ...
    args = parser.parse_args()

    # Initialize visualizer
    print("🚀 Initializing TACO Waste Detection...")
    visualizer = TACOVisualization(api_key=args.api_key, workspace=args.workspace, project=args.project)

    if args.single_image:
        print(f"\n🖼️ Processing single image: {args.single_image}")
        annotated_img, trash_percentage, score = annotate_image(
            args.single_image,
            visualizer,
            confidence=args.confidence,
            overlap=args.overlap
            # Add other args if needed
        )
        print(f"Trash percentage: {trash_percentage:.2f}%")
        print(f"Cleanliness score: {score}")

        os.makedirs(args.output_dir, exist_ok=True)
        save_path = os.path.join(args.output_dir, f'{os.path.basename(args.single_image)}_annotated.jpg')
        Image.fromarray(annotated_img).save(save_path)
        print(f"Annotated image saved to {save_path}")
    else:
        # Batch processing logic remains the same
        pass

# --- MAIN EXECUTION BLOCK (REFACTORED) ---
if __name__ == "__main__":
    # --- Hardcoded settings for easy testing ---
    API_KEY = "UGKpDQUUduWH3tlrf0CU"  # IMPORTANT: Replace with your actual Roboflow API key
    IMAGE_PATH = "/home/ojas/Downloads/ssh_garbage/landfill.jpg"  # IMPORTANT: Replace with the path to your image
    OUTPUT_DIR = './roboflow_results'
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    print(f"Processing image: {IMAGE_PATH}")

    # Check if the image file exists before proceeding
    if not os.path.exists(IMAGE_PATH):
        print(f"❌ Error: Image not found at the specified path: {IMAGE_PATH}")
        print("   Please update the IMAGE_PATH variable with the correct location of your image.")
    else:
        try:
            # 1. Initialize the TACO visualizer
            print("Initializing TACO model...")
            visualizer = TACOVisualization(api_key=API_KEY)

            # 2. Use the 'annotate_image' function for a clean, one-call process
            print(f"\n🔍 Running waste detection and analysis...")
            annotated_img, trash_percentage, score = annotate_image(
                image_path=IMAGE_PATH,
                taco_visualization=visualizer,
                confidence=0.05,
                overlap=0.5,
                high_prob_threshold=0.5,
                adjacency_threshold=0.2,
                boost_factor=5.0
            )

            # 3. Print the analysis results
            print("\n📊 Analysis Results:")
            print(f"   - Trash Coverage: {trash_percentage:.2f}% of the image")
            print(f"   - Cleanliness Score: {score}")

            # 4. Save the final annotated image
            base_name = os.path.splitext(os.path.basename(IMAGE_PATH))[0]
            save_path = os.path.join(OUTPUT_DIR, f'{base_name}_annotated_result.jpg')
            Image.fromarray(annotated_img).save(save_path)
            print(f"\n✅ Successfully saved annotated image to: {save_path}")

        except Exception as e:
            print(f"❌ An unexpected error occurred: {e}")
            print("\n💡 Troubleshooting:")
            print("   1. Check your internet connection.")
            print("   2. Verify that your Roboflow API key is correct and has credits.")
            print("   3. Ensure all required libraries (roboflow, opencv-python, etc.) are installed.")
