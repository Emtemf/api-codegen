package com.apicgen.bridge;

import com.fasterxml.jackson.databind.ObjectMapper;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.List;

/**
 * 供本地 UI/插件桥接调用的 JSON CLI。
 */
public class UiBridgeMain {

    private static final ObjectMapper JSON = new ObjectMapper();

    public static void main(String[] args) throws Exception {
        String command = args.length > 0 ? args[0] : "analyze";
        String payload = readAllStdin();
        Request request = payload == null || payload.isBlank()
            ? new Request("", List.of())
            : JSON.readValue(payload, Request.class);

        UiDocumentService service = new UiDocumentService();

        Object response = switch (command) {
            case "fix" -> service.fix(request.yaml(), request.selectedIssueKeys());
            case "analyze" -> service.analyze(request.yaml());
            default -> throw new IllegalArgumentException("Unsupported command: " + command);
        };

        System.out.print(JSON.writeValueAsString(response));
    }

    private static String readAllStdin() throws Exception {
        StringBuilder sb = new StringBuilder();
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(System.in, StandardCharsets.UTF_8))) {
            String line;
            boolean first = true;
            while ((line = reader.readLine()) != null) {
                if (!first) {
                    sb.append('\n');
                }
                sb.append(line);
                first = false;
            }
        }
        return sb.toString();
    }

    public record Request(String yaml, List<String> selectedIssueKeys) {
    }
}
