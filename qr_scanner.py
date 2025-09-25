import cv2
from pyzbar import pyzbar

# Initialize webcam
cap = cv2.VideoCapture(0)

print("Starting QR code scanner. Press 'q' to quit.")

while True:
    ret, frame = cap.read()
    if not ret:
        break

    # Detect QR codes in the frame
    decoded_objs = pyzbar.decode(frame)
    for obj in decoded_objs:
        # Draw rectangle around QR code
        (x, y, w, h) = obj.rect
        cv2.rectangle(frame, (x, y), (x + w, y + h), (0, 255, 0), 2)
        # Print QR code data
        qr_data = obj.data.decode('utf-8')
        print(f"QR Code detected: {qr_data}")
        cv2.putText(frame, qr_data, (x, y - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 2)

    # Display the frame
    cv2.imshow('QR Scanner', frame)

    # Exit on pressing 'q'
    if cv2.waitKey(1) & 0xFF == ord('q'):
        break

cap.release()
cv2.destroyAllWindows()
