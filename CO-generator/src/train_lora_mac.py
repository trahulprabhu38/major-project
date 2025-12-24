import torch
from datasets import load_dataset
from transformers import (
    AutoTokenizer,
    AutoModelForCausalLM,
    TrainingArguments,
    Trainer
)
from peft import LoraConfig, get_peft_model

# -----------------------------
# CONFIG
# -----------------------------
MODEL_NAME = "EleutherAI/gpt-neo-125M"
DATA_PATH = "data/jsonl/train.jsonl"

device = "mps" if torch.backends.mps.is_available() else "cpu"
print("Using device:", device)

# -----------------------------
# LOAD DATA
# -----------------------------
print("Loading dataset...")
data = load_dataset("json", data_files=DATA_PATH)

# -----------------------------
# TOKENIZER & MODEL
# -----------------------------
print("Loading tokenizer...")
tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)
tokenizer.pad_token = tokenizer.eos_token

print("Loading model...")
model = AutoModelForCausalLM.from_pretrained(MODEL_NAME)

# Important: keep on CPU until after LoRA
# model.to(device)

# -----------------------------
# LoRA CONFIG
# GPT-Neo does NOT have q_proj/k_proj/v_proj/out_proj
# Valid modules: "attention.w", "mlp.c_fc", "mlp.c_proj"
# -----------------------------
lora_config = LoraConfig(
    r=8,
    lora_alpha=16,
    target_modules=["attention.w", "mlp.c_fc", "mlp.c_proj"],
    lora_dropout=0.1,
    bias="none",
    task_type="CAUSAL_LM",
)

model = get_peft_model(model, lora_config)
model.print_trainable_parameters()

# ⭐ IMPORTANT ⭐
# Move model to MPS AFTER LoRA injection
model.to(device)

# -----------------------------
# PREPROCESS FUNCTION
# -----------------------------
def preprocess(example):
    prompt = f"Instruction: {example['instruction']}\n\nCOs:"
    output = example["output"]
    text = prompt + output

    tokenized = tokenizer(
        text,
        truncation=True,
        padding="max_length",
        max_length=512
    )

    tokenized["labels"] = tokenized["input_ids"].copy()
    return tokenized

print("Tokenizing...")
dataset = data.map(preprocess, batched=False)

# -----------------------------
# TRAINING ARGUMENTS
# -----------------------------
training_args = TrainingArguments(
    output_dir="gptneo_co_lora",
    per_device_train_batch_size=1,
    gradient_accumulation_steps=4,
    learning_rate=2e-4,
    num_train_epochs=3,
    logging_steps=10,
    save_strategy="epoch",
    
    fp16=False,        # MPS does NOT support fp16
    bf16=False,        # Also avoid bf16 on MPS
    no_cuda=True,      # Prevent Trainer from trying to move to CUDA
)

# -----------------------------
# TRAIN
# -----------------------------
trainer = Trainer(
    model=model,
    args=training_args,
    train_dataset=dataset["train"],
)

print("Starting training...")
trainer.train()

# -----------------------------
# SAVE MODEL
# -----------------------------
model.save_pretrained("gptneo_co_lora")
tokenizer.save_pretrained("gptneo_co_lora")

print("Training complete!")
